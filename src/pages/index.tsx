import demoGif from '../assets/demo.gif';

export default function HomePage() {
  return (
    <div>
      <h2>可拖动树表</h2>
      <p>
        <img src={demoGif} width="654" />
      </p>
      <p>
        基于 Ant desgin Table组件的可拖动版本，可以排序和改变父节点.
      </p>
    </div>
  );
}
