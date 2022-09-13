import React, { CSSProperties, ReactNode, useCallback, useRef, useState } from 'react'
import { Table, TableProps } from 'antd';
import type { XYCoord, Identifier } from 'dnd-core';
import { DndProvider, DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import "./dragableTreeTable.css";
import { ColumnsType } from 'antd/es/table';
import cloneDeep from 'lodash.clonedeep';
import { HolderOutlined } from '@ant-design/icons';

const handleStyle: CSSProperties = {
  marginRight: '0.75rem',
  cursor: 'move',
}

//#region 列表数据

const findTree = <TKey,>(tree: readonly IDraggableTableItem<TKey>[] | undefined, id: TKey): IDraggableTableItem<TKey> | undefined => {
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

//#endregion


export interface IDraggableBodyRowProps<TKey> extends React.HTMLAttributes<HTMLTableRowElement> {
  nodeId: TKey;
  nodePid?: TKey;
  children?: ReactNode[];
  isParent: (parentId: TKey, childId: TKey) => boolean;
  moveNode: (dragId: TKey, hoverId: TKey, movePosition: MovePosition) => void;
}

export interface IDraggableCellProps<T> extends React.HTMLAttributes<HTMLTableCellElement> {
  rowIndex: number;
  record: T;
}

export interface IDraggableTableItem<TKey> {
  id: TKey;
  pid?: TKey;
  children?: IDraggableTableItem<TKey>[]
}

interface IDragItem<TKey> {
  id: TKey;
  pid?: TKey;
  type: string;
}

export enum MovePosition {
  unkown,
  before,
  child,
  after
}

function getMovePosition<TKey>(ref: React.RefObject<HTMLTableRowElement>, monitor: DropTargetMonitor<IDragItem<TKey>, void>): MovePosition {
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
const DraggableBodyCell = <T,>(props: IDraggableCellProps<T>) => {
  const {
    rowIndex,
    record,
    children,
    ...restProps
  } = props;

  // 给单元格添加拖拽手柄
  const handlerRef = (record as { _dragHandlerRef?: React.Ref<HTMLSpanElement> })?._dragHandlerRef;
  if (handlerRef)
    return (
      <td
        {...restProps}
      >
        <HolderOutlined ref={handlerRef} style={handleStyle} />
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
const DraggableBodyRow = <TKey,>({
  nodeId,
  nodePid,
  isParent,
  moveNode,
  className,
  style,
  ...restProps
}: IDraggableBodyRowProps<TKey>) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const [moveState, setMoveState] = useState(MovePosition.unkown);

  const [{ isOver }, drop] = useDrop<IDragItem<TKey>, void, { isOver: boolean }>({
    accept: dragType,
    collect: monitor => {
      const { id: dragId } = monitor.getItem() || {};
      if (dragId === nodeId) {
        return { isOver: false };
      }
      else {
        const dragId = monitor.getItem()?.id;
        return {
          isOver: monitor.isOver() && !isParent(dragId, nodeId)
        };
      }
    },
    hover: (item, monitor) => {
      setMoveState(getMovePosition(ref, monitor));
    },
    canDrop: (item, monitor) => {
      // 禁止父节点拖到子节点
      if (item.id == nodeId)
        return false;

      console.log("canDrop:", !isParent(item.id, nodeId), "pid:", item.id, "id:", nodeId)
      return !isParent(item.id, nodeId)
    },
    drop: (item: IDragItem<TKey>, monitor) => {
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

export interface IDragableTreeTableProps<T, TKey>
  extends TableProps<T> {
  data?: T[];
  onNodeMoving?: (dragId: TKey, hoverId: TKey, movePosition: MovePosition) => boolean;
  onNodeMoved?: (dragId: TKey, hoverId: TKey, movePosition: MovePosition) => void;
}

// 表格
export default function DragableTreeTable<T extends IDraggableTableItem<TKey>, TKey>(props: IDragableTreeTableProps<T, TKey>) {

  const { dataSource, onNodeMoving, onNodeMoved, columns, ...restProps } = props;
  const [items, setItems] = useState(dataSource);
  const itemsRef = useRef(items); // 确保拖动操作的闭包中拿到最新的items
  const components = {
    body: {
      row: DraggableBodyRow,
      cell: DraggableBodyCell,
    },
  };

  const moveNode = useCallback(
    (dragId: TKey, hoverId: TKey, position: MovePosition) => {
      if (onNodeMoving && onNodeMoving(dragId, hoverId, position) !== true)
        return;

      setItems(prevItems => {
        if (!prevItems)
          return prevItems;

        let nextItems: T[] = cloneDeep(prevItems) as T[];

        const dragNode = findTree(nextItems, dragId);
        const hoverNode = findTree(nextItems, hoverId);

        if (dragNode && hoverNode) {
          const dragCollection = findTree(nextItems, dragNode.pid)?.children ?? nextItems;

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

        itemsRef.current = nextItems;
        return nextItems;
      });

      onNodeMoved?.(dragId, hoverId, position)
    },
    [],
  );

  /**
 * 判断树中parentId和childId的父子关系是否成立。
 * @param parentId 父节点Id
 * @param childId  子节点Id
 * @returns 
 */
  
  const isParent = useCallback(
    (parentId: TKey, childId: TKey) => {
      const parent = findTree(itemsRef.current, parentId);
      if (!parent)
        return false;

      const child = findTree(parent.children, childId)
      return !!child;
    },
    []);

  return (
    <DndProvider backend={HTML5Backend}>
      <Table<T>
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
          return attr as IDraggableBodyRowProps<TKey>;
        }}
        {...restProps}
      />
    </DndProvider>

  );
}



