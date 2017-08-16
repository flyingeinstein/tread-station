/*
    ./client/components/App.jsx
*/
import React from 'react';
import "app.css";
import "style.css";
import "red.css";
import "controls.css";
import "modal.css";
import "panels.css";
import TreadmillControl from "./TreadmillControl.jsx";


export default class App extends React.Component {

  render() {
    return (
     <div>
         <TreadmillControl></TreadmillControl>
     </div>);
  }
}
