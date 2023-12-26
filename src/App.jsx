import { useState } from "react";
import Player from "./components/Player";
import "./App.css";

function App() {
  const [inputSrc, setInputSrc] = useState();
  const [src, setSrc] = useState();

  function handleChange(e) {
    console.log(e);
    setInputSrc(() => e.target.value);
  }
  function handleSubmit(e) {
    console.log("가져오기");
    e.preventDefault();
    setSrc(() => inputSrc);
  }
  return (
    <>
      <h1>M3U8 Player</h1>
      <form onSubmit={handleSubmit}>
        <label>M3U8 URL</label>
        <input type="url" onChange={handleChange} value={inputSrc}></input>
        <button type="submit">가져오기</button>
      </form>

      {src && <Player src={src}></Player>}
    </>
  );
}

export default App;
