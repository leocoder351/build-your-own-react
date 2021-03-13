import React, { mountTree, unmountTree } from './app.js';

class App extends React.Component {
  componentWillMount() {
    console.log('App componentWillMount');
  }

  componentWillUnMount() {
    console.log('App componentWillUnMount');
  }

  render() {
    return (
      <div>
        <p>build your own react</p>
        <Wrapper content="btn" />
      </div>
    )
  }
}

function Wrapper(props) {
  return (
    <div>
      <p>{props.content}</p>
      <span>hello</span>
    </div>
  )
}

let rootElem = document.getElementById('app');
mountTree(<App />, rootElem);

document.getElementById('mount').addEventListener('click', function() {
  console.log('mount');
  mountTree(<App />, rootElem);
});

document.getElementById('unmount').addEventListener('click', () => {
  console.log('unmount');
  unmountTree(rootElem);
});