import React, { CSSProperties, ReactNode, useCallback, useRef, useState } from 'react'
import { Table } from 'antd';
import type { XYCoord, Identifier } from 'dnd-core';
import { DndProvider, DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import update from 'immutability-helper';
import "antd/dist/antd.css";
import "./DragableTreeTable.css";
import { ColumnsType } from 'antd/es/table';
import cloneDeep from 'lodash.clonedeep';
import { HolderOutlined } from '@ant-design/icons';

const handleStyle: CSSProperties = {
  marginRight: '0.75rem',
  cursor: 'move',
}

//#region 列表数据

const columns: ColumnsType<ITableItem> = [
  {
    title: 'ID',
    dataIndex: 'id',
    onCell: (record, rowIndex) => {
      return {
        rowIndex,
        record
      } as IDraggableCellProps;
    }
  },

  // {
  //   title: '排序',
  //   dataIndex: 'sort',
  // },
  {
    title: '菜单名称',
    dataIndex: 'name',
    //   className: 'drag-visible',
  },
  {
    title: '路由',
    dataIndex: 'path',
  },
  {
    title: '真实路径',
    dataIndex: 'component',
  },
  {
    title: '图标',
    dataIndex: 'icon',
  },
  {
    title: '备注',
    dataIndex: 'remark',
  },
  {
    title: '状态',
    dataIndex: 'status',
  },
];

interface ITableItem {
  id: number;
  pid: number;
  orderNum: number;
  menuType: number;
  name: string;
  path: string;
  component: string;
  icon: string;
  remark: string;
  status: number;
  _dragHandlerRef?: React.RefObject<HTMLDivElement>;
  children?: ITableItem[];
}

const defaultItems: ITableItem[] = [
  {
    id: 2,
    pid: 0,
    orderNum: 1,
    menuType: 1,
    name: '父级菜单1',
    path: "/xxxxxxxxxxx",
    component: './xxxxxxxxxxx',
    icon: 'table',
    remark: '父级菜单1',
    status: 0,
  },
  {
    id: 3,
    pid: 0,
    orderNum: 2,
    menuType: 1,
    name: '父级菜单2',
    path: "/xxxxxxxxxxx",
    component: '',
    icon: 'crown',
    remark: '父级菜单2',
    status: 0,
  },
  {
    id: 42,
    pid: 0,
    orderNum: 41,
    menuType: 1,
    name: '父级菜单3',
    path: "/xxxxxxxxxxx",
    component: './xxxxxxxxxxx',
    icon: 'table',
    remark: '',
    status: 0,
  },
  {
    id: 4,
    pid: 3,
    orderNum: 3,
    menuType: 1,
    name: '2的子菜单1',
    path: "/xxxxxxxxxxx/xxxxxx",
    component: './xxxxxxxxxxx/xxxxxx',
    icon: '',
    remark: '',
    status: 0,
  },
  {
    id: 11,
    pid: 3,
    orderNum: 10,
    menuType: 1,
    name: '2的子菜单2',
    path: "/xxxxxxxxxxx/xxxxxx",
    component: './xxxxxxxxxxx/xxxxxx',
    icon: '',
    remark: '',
    status: 1,
  },
  {
    id: 20,
    pid: 3,
    orderNum: 10,
    menuType: 1,
    name: '2的子菜单3',
    path: "./xxxxxxxxxxx/xxxxxx",
    component: './xxxxxxxxxxx/xxxxxx',
    icon: '',
    remark: '',
    status: 1,
  },
  {
    id: 50,
    pid: 20,
    orderNum: 10,
    menuType: 1,
    name: '子菜单3的子菜单1',
    path: "/xxxxxxxxxxx/xxxxxx",
    component: './xxxxxxxxxxx/xxxxxx',
    icon: '',
    remark: '',
    status: 1,
  },
]

const findTree = (tree: ITableItem[] | undefined, id: number): ITableItem | undefined => {
  if (!tree)
    return;

  for (const item of tree) {
    if (item.children) {
      const findItem = findTree(item.children, id);
      if (findItem)
        return findItem;
    }
    if (item.id === id)
      return item;
  };
}

// 平铺列表转化成  树状数组结构
const toTree = (data: ITableItem[]) => {
  let result: ITableItem[] = []
  if (!Array.isArray(data)) {
    return result
  }
  data.forEach(item => {
    delete item.children;
  });

  let map: Record<number, ITableItem> = {};
  data.forEach(item => {
    map[item.id] = item;
  });
  data.forEach(item => {
    let parent = map[item.pid];
    if (parent) {
      (parent.children || (parent.children = [])).push(item);
    } else {
      result.push(item);
    }
  });
  return result;
}
//#endregion

interface IDraggableBodyRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  nodeId: number;
  nodePid?: number;
  children?: ReactNode[];
  isParent: (parentId: number, childId: number) => boolean;
  moveNode: (dragId: number, hoverId: number, movePosition: MovePosition) => void;
}

interface IDraggableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  rowIndex: number;
  isDragHandler: boolean;
  record: ITableItem;
}

interface IDragItem {
  id: number;
  pid?: number;
  type: string;
}

enum MovePosition {
  unkown,
  before,
  child,
  after
}

function getMovePosition(ref: React.RefObject<HTMLTableRowElement>, monitor: DropTargetMonitor<IDragItem, void>): MovePosition {
  const hoverBoundingRect = ref.current?.getBoundingClientRect()
  if (!hoverBoundingRect)
    return MovePosition.unkown;

  // 获取水平中线位置
  const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

  // Determine mouse position
  const clientOffset = monitor.getClientOffset()
  if (!clientOffset)
    return MovePosition.unkown;

  // Get pixels to the top
  const mouseY = (clientOffset as XYCoord).y - hoverBoundingRect.top

  // Only perform the move when the mouse has crossed half of the items height
  // When dragging downwards, only move when the cursor is below 50%
  // When dragging upwards, only move when the cursor is above 50%

  // Dragging downwards
  if (mouseY > hoverMiddleY - 10 && mouseY < hoverMiddleY + 10) {
    return MovePosition.child;
  }
  else if (mouseY < hoverMiddleY - 10)
    return MovePosition.before;
  else
    return MovePosition.after;
}


function getDropClassName(moveState: MovePosition) {
  switch (moveState) {
    case MovePosition.before:
      return " drop-over-upward";

    case MovePosition.child:
      return " drop-over-child";

    case MovePosition.after:
      return " drop-over-downward";

    default:
      return "";
  }
}
const dragType = 'DraggableBodyRow';

// 单元格
const DraggableBodyCell = (props: IDraggableCellProps) => {
  const {
    isDragHandler,
    rowIndex,
    record,
    children,
    ...restProps
  } = props;

  if (record?._dragHandlerRef)
    return (
      <td
        {...restProps}
      >
        <HolderOutlined ref={record._dragHandlerRef} style={handleStyle} />
        {/* <div ref={record._dragHandlerRef} className="drag-handle" ></div> */}
        {children}
      </td>
    );
  else
    return (<td
      children={children}
      {...restProps}
    />);

}

// 行
const DraggableBodyRow = ({
  nodeId,
  nodePid,
  isParent,
  moveNode,
  className,
  style,
  ...restProps
}: IDraggableBodyRowProps) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const [moveState, setMoveState] = useState(MovePosition.unkown);

  const [{ isOver }, drop] = useDrop<IDragItem, void, { isOver: boolean }>({
    accept: dragType,
    collect: monitor => {
      const { id: dragId } = monitor.getItem() || {};
      console.log("dragId:", dragId, "hoverId:", nodeId)
      if (dragId === nodeId) {
        return { isOver: false };
      }
      else {
        return {
          isOver: monitor.isOver()
        };
      }
    },
    hover: (item, monitor) => {
      setMoveState(getMovePosition(ref, monitor));
    },
    canDrop: (item, monitor) => {
      // 禁止父节点拖到子节点
      return !isParent(item.id, nodeId)
    },
    drop: (item: IDragItem, monitor) => {
      if (item.id != nodeId) {
        moveNode(item.id, nodeId, getMovePosition(ref, monitor));
      }
    },
  }, []);

  const [, drag, preview] = useDrag({
    type: dragType,
    item: { id: nodeId, pid: nodePid },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  preview(ref)
  drop(ref);
  const dragRef = useRef<HTMLDivElement>(null);
  if (restProps.children?.length && restProps.children?.length > 0) {
    const child = restProps.children[0] as any;
    if (child?.props?.record) {
      child.props.record._dragHandlerRef = dragRef
      drag(dragRef)
    }
  }

  const dropClassName = getDropClassName(moveState);
  return (
    <tr
      ref={ref}
      className={`${className}${isOver ? dropClassName : ''}`}
      style={style}
      {...restProps}
    />
  );
};


// 表格
export default function DragableTreeTable() {

  const [items, setItems] = useState(toTree(defaultItems));

  const components = {
    body: {
      row: DraggableBodyRow,
      cell: DraggableBodyCell,
    },
  };

  const moveNode = useCallback(
    (dragId: number, hoverId: number, position: MovePosition) => {

      setItems(prevItems => {
        let nextItems: ITableItem[] = cloneDeep(prevItems);

        const dragNode = findTree(nextItems, dragId);
        const hoverNode = findTree(nextItems, hoverId);

        if (dragNode && hoverNode) {
          const dragParent = findTree(nextItems, dragNode.pid);
          const dragCollection = findTree(nextItems, dragNode.pid)?.children ?? nextItems;
          const hoverParent = findTree(nextItems, hoverNode.pid);

          let hoverCollection;
          if (position == MovePosition.child) {
            if (!hoverNode.children)
              hoverNode.children = [];
            hoverCollection = hoverNode.children;
            dragNode.pid = hoverNode.id;
          }
          else {
            hoverCollection = findTree(nextItems, hoverNode.pid)?.children ?? nextItems;
            dragNode.pid = hoverNode.pid;
          }

          // 拖动到其它节点
          // 从源集合删除拖动的节点
          dragCollection.splice(dragCollection.indexOf(dragNode), 1);

          // 将拖动节点添加到目标集合
          let hoverIndex = hoverCollection.indexOf(hoverNode);
          if (position == MovePosition.after) {
            hoverIndex += 1;
          }
          else if (position == MovePosition.child) {
            hoverIndex = 0;
          }

          hoverCollection.splice(hoverIndex, 0, dragNode);
        }

        return nextItems;
      });

    },
    [items],
  );

  /**
 * 判断树中parentId和childId的父子关系是否成立。
 * @param parentId 父节点Id
 * @param childId  子节点Id
 * @returns 
 */
  const isParent = useCallback(
    ( parentId: number, childId: number) => {
      const parent = findTree(items, parentId);
      if (!parent)
        return false;

      const child = findTree(parent.children, childId)
      return !!child;
    },
    [items]);

  const moveRow = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const dragRow = items[dragIndex];
      setItems(
        update(items, {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragRow],
          ],
        }),
      );
    },
    [items]);


  return (
    <DndProvider backend={HTML5Backend}>
      <Table<ITableItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        components={components}
        onRow={(record, index) => {
          const attr = {
            nodeId: record.id,
            nodePid: record?.pid,
            isParent,
            moveNode
          };
          return attr as IDraggableBodyRowProps;
        }}

      />
    </DndProvider>

  );
}



