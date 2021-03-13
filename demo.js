import React, { mountTree, unmountTree } from './app.js';

let text = 'abcdefg';

class App extends React.Component {
  componentWillMount() {
    console.log('App componentWillMount');
  }

  componentWillUpdate() {
    console.log('App componentWillUpdate');
  }

  componentWillUnMount() {
    console.log('App componentWillUnMount');
  }

  render() {
    return (
      <div>
        <p>build your own react</p>
        <Wrapper content={this.props.content} />
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
mountTree(<App content="tom" />, rootElem);

document.getElementById('mount').addEventListener('click', function() {
  console.log('mount');
  mountTree(<App content="leo" />, rootElem);
});

document.getElementById('unmount').addEventListener('click', () => {
  console.log('unmount');
  unmountTree(rootElem);
});