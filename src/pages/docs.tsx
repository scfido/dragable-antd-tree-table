import React, { useCallback, useRef, useState } from 'react'
import { Table, Card, Form } from 'antd';
import type { XYCoord, Identifier } from 'dnd-core';
import { DndProvider, DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import update from 'immutability-helper';
import "antd/dist/antd.css";
import "./docs.css";
import { ColumnsType } from 'antd/es/table';
let dragingIndex = -1;

//#region 列表数据

const columns: ColumnsType<ITableItem> = [
  {
    title: 'ID',
    dataIndex: 'id',
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
  children?: ITableItem[];
}

const defaultItem: ITableItem[] = [
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

interface DraggableBodyRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
}

interface DragItem {
  index: number
  id: string
  type: string
}

enum MovePosition {
  Unkown,
  Before,
  Child,
  After
}

function getMovePosition(ref: React.RefObject<HTMLTableRowElement>, monitor: DropTargetMonitor<DragItem, void>): MovePosition {
  const hoverBoundingRect = ref.current?.getBoundingClientRect()
  if (!hoverBoundingRect)
    return MovePosition.Unkown;

  // 获取水平中线位置
  const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

  // Determine mouse position
  const clientOffset = monitor.getClientOffset()
  if (!clientOffset)
    return MovePosition.Unkown;

  // Get pixels to the top
  const mouseY = (clientOffset as XYCoord).y - hoverBoundingRect.top

  // Only perform the move when the mouse has crossed half of the items height
  // When dragging downwards, only move when the cursor is below 50%
  // When dragging upwards, only move when the cursor is above 50%

  // Dragging downwards
  if (mouseY > hoverMiddleY - 10 && mouseY < hoverMiddleY + 10) {
    return MovePosition.Child;
  }
  else if (mouseY < hoverMiddleY - 10)
    return MovePosition.Before;
  else
    return MovePosition.After;
}

const type = 'DraggableBodyRow';

const DraggableBodyRow = ({
  index,
  moveRow,
  className,
  style,
  ...restProps
}: DraggableBodyRowProps) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const [moveState, setMoveState] = useState(MovePosition.Unkown);

  const [{ isOver, dropClassName }, drop] = useDrop<DragItem, void, { isOver: boolean, dropClassName: string }>({
    accept: type,
    collect: monitor => {

      // Get pixels to the top
      console.log(monitor.getClientOffset())


      // if (!ref.current) {
      //   return {};
      // }
      const { index: dragIndex } = monitor.getItem() || {};
      // if (dragIndex === index) {
      //   return {};
      // }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      if (!hoverBoundingRect)
        return {};

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Determine mouse position

      const clientOffset = monitor.getClientOffset()
      if (!clientOffset)
        return {};

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (hoverClientY > hoverMiddleY - 10 && hoverClientY < hoverMiddleY + 10) {
        return {
          isOver: monitor.isOver(),
          dropClassName: ' drop-over-child',
        };
      }

      console.log("hoverClientY:", hoverClientY, " hoverMiddleY:", hoverMiddleY)

      return {
        isOver: monitor.isOver(),
        dropClassName: dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
      };
    },
    hover: (item, monitor) => {
      var pos = getMovePosition(ref, monitor);
      setMoveState(pos);
    },
    drop: (item: { index: number }) => {
      moveRow(item.index, index);
    },
  });

  const [, drag] = useDrag({
    type,
    item: { index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drop(drag(ref));

  let dropCss = "";
  switch (moveState) {
    case MovePosition.Before:
      dropCss = " drop-over-upward"
      break;

    case MovePosition.Child:
      dropCss = " drop-over-child"
      break;

    case MovePosition.After:
      dropCss = " drop-over-downward"
      break;

    default:
      dropCss = "";
      break;
  }

  console.log("dropCss:", dropCss, "isOver:", isOver)

  return (
    <tr
      ref={ref}
      // className={`${className}${isOver ? dropClassName : ''}`}
      className={`${className}${isOver ? dropCss : ''}`}
      style={{ cursor: 'move', ...style }}
      {...restProps}
    />
  );
};

// 表格
export default function DragableTreeTable() {

  const [items, setItems] = useState(defaultItem);

  const components = {
    body: {
      row: DraggableBodyRow,
    },
  };

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
    [items],
  );


  return (
    <DndProvider backend={HTML5Backend}>
      <Table<ITableItem>
        rowKey="id"
        columns={columns}
        dataSource={toTree(items)}
        components={components}
        onRow={(record, index) => {
          const attr = {
            index,
            moveRow,
          };
          return attr as React.HTMLAttributes<any>;
        }}
      />
    </DndProvider>

  );
}


