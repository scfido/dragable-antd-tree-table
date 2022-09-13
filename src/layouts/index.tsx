import { Link, Outlet } from 'umi';
import styles from './index.less';

export default function Layout() {
  return (
    <div className={styles.navs}>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/table">可拖动树表</Link>
        </li>
        <li>
          <a href="https://github.com/scfido/dragableTreeTable">Github</a>
        </li>
      </ul>
      <Outlet />
    </div>
  );
}
