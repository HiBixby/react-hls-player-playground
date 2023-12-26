import { useEffect, useRef } from "react";
import muxjs from "mux.js";
import "./Player.module.css";
import { getResolutionList, getSegmentUrlList } from "../utils/api";

function Player({ src }) {
  const origin = new URL(src).origin;
  const videoRef = useRef();
  const mediaSourceRef = useRef();
  const sourceBufferRef = useRef();
  const segmentUrlsRef = useRef();
  const transmuxerRef = useRef();
  const totalTimeRef = useRef();

  function waitForUpdateEnd() {
    return new Promise((resolve) => {
      function checkUpdateEnd() {
        if (!sourceBufferRef.current.updating) {
          resolve();
        } else {
          requestAnimationFrame(checkUpdateEnd);
        }
      }
      checkUpdateEnd();
    });
  }

  async function appendFirstSegment() {
    const mime = 'video/mp4; codecs="avc1.640020,mp4a.40.2"';
    console.log("sourceopen event");
    if (mediaSourceRef.current.sourceBuffers.length > 0) return;
    if (segmentUrlsRef.current.length == 0) {
      return;
    }

    URL.revokeObjectURL(videoRef.current.src);
    sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer(mime);
    mediaSourceRef.current.duration = totalTimeRef.current;
    sourceBufferRef.current.addEventListener("updateend", async function () {
      console.log("updateend event");
      await waitForUpdateEnd();
      appendNextSegment();
    });

    transmuxerRef.current.on("data", (segment) => {
      let data = new Uint8Array(
        segment.initSegment.byteLength + segment.data.byteLength
      );
      data.set(segment.initSegment, 0);
      data.set(segment.data, segment.initSegment.byteLength);
      console.log(muxjs.mp4.tools.inspect(data));
      sourceBufferRef.current.appendBuffer(data);
    });

    const response = await fetch(segmentUrlsRef.current.shift());
    const segmentData = await response.arrayBuffer();
    transmuxerRef.current.push(new Uint8Array(segmentData));
    transmuxerRef.current.flush();
  }

  function appendNextSegment() {
    if (mediaSourceRef.current.readyState == "closed") return;

    if (segmentUrlsRef.current.length == 0) {
      // notify MSE that we have no more segments to append.
      mediaSourceRef.current.endOfStream();
    }

    if (mediaSourceRef.current.sourceBuffers[0].updating) return;
    const bufferedLength = sourceBufferRef.current.buffered.length;
    const futureBufferedTime =
      sourceBufferRef.current.buffered.end(bufferedLength - 1) -
      sourceBufferRef.current.buffered.start(0);
    if (futureBufferedTime - videoRef.current.currentTime > 10) return;

    transmuxerRef.current.off("data");
    transmuxerRef.current.on("data", (segment) => {
      sourceBufferRef.current.appendBuffer(new Uint8Array(segment.data));
    });

    let seg = segmentUrlsRef.current.shift();
    console.log(seg);
    fetch(seg)
      .then((response) => {
        return response.arrayBuffer();
      })
      .then((response) => {
        transmuxerRef.current.push(new Uint8Array(response));
        transmuxerRef.current.flush();
      });
  }

  useEffect(() => {
    async function addVideo() {
      let resolution = await getResolutionList(src);

      const segmentUrlList = await getSegmentUrlList(
        origin + resolution[0].path
      );
      segmentUrlsRef.current = segmentUrlList.segmentUrls;
      totalTimeRef.current = segmentUrlList.totalTime;

      mediaSourceRef.current = new MediaSource();
      transmuxerRef.current = new muxjs.mp4.Transmuxer();
      videoRef.current.src = URL.createObjectURL(mediaSourceRef.current);

      mediaSourceRef.current.addEventListener("sourceopen", appendFirstSegment);
    }
    addVideo();
  }, [src, origin]);
  function timeUpdateHandler(e) {}
  function seekingHandler(e) {
    if (mediaSourceRef.current.readyState == "open") {
      sourceBufferRef.current.abort();
    }
    console.log(sourceBufferRef.current);
    console.log(mediaSourceRef.current);
    waitForUpdateEnd().then(() => {
      appendNextSegment();
    });
    console.log(e);
  }

  return (
    <>
      <video
        ref={videoRef}
        controls
        onTimeUpdate={timeUpdateHandler}
        onSeeking={seekingHandler}
      ></video>
    </>
  );
}

export default Player;
