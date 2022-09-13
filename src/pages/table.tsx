import React from 'react'
import "antd/dist/antd.css";
import { ColumnsType } from 'antd/es/table';
import DragableTreeTable, { IDraggableCellProps, IDraggableTableItem } from '@/components/dragableTreeTable/dragableTreeTable';

//#region 列表数据

const columns: ColumnsType<ITableItem<number>> = [
  {
    title: 'ID',
    dataIndex: 'id',
    onCell: (record, rowIndex) => {
      return {
        rowIndex,
        record
      } as IDraggableCellProps<ITableItem<number>>;
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

interface ITableItem<TKey> extends IDraggableTableItem<TKey> {
  id: TKey;
  pid: TKey;
  orderNum: number;
  menuType: number;
  name: string;
  path: string;
  component: string;
  icon: string;
  remark: string;
  status: number;
  _dragHandlerRef?: React.RefObject<HTMLDivElement>;
  children?: ITableItem<TKey>[];
}

const testItems: ITableItem<number>[] = [
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
const toTree = (data: ITableItem<number>[]) => {
  let result: ITableItem<number>[] = []
  if (!Array.isArray(data)) {
    return result
  }
  data.forEach(item => {
    delete item.children;
  });

  let map: Record<number, ITableItem<number>> = {};
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

const TreeTableDemoPage = () => {
  return (
    <DragableTreeTable<ITableItem<number>, number>
      rowKey="id"
      columns={columns}
      dataSource={toTree(testItems)}
    />)
}

export default TreeTableDemoPage


