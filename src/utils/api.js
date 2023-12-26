async function getResolutionList(src) {
    let resolution = []
    await fetch(src)
        .then((response) => response.text())
        .then((m3u8Content) => {
            let lines = m3u8Content.split("\n");

            // 각 라인을 반복하며 처리합니다.
            lines.forEach((line, index) => {
                if (line.startsWith("#EXT-X-STREAM-INF:")) {
                    // 스트림 이름을 추출합니다.
                    let nameMatch = line.match(/NAME="([^"]+)"/);
                    let name = nameMatch ? nameMatch[1] : null;

                    // 다음 라인은 스트림의 URL이 됩니다.
                    let url = lines[index + 1];

                    // 결과 객체를 생성하고 배열에 추가합니다.
                    let streamObj = { name: name, path: url };
                    resolution.push(streamObj);
                }
            });
        });
    return resolution;

}
async function getSegmentUrlList(url) {
    let segmentUrls = []
    let totalTime = 0;
    await fetch(url)
        .then((response) => response.text())
        .then((m3u8Content) => {
            let parts = url.split("/");

            // 마지막 부분을 제외하고 다시 결합합니다.
            let baseURL = parts.slice(0, -1).join("/") + "/";
            const lines = m3u8Content.split("\n");

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // 각 EXTINF 항목에서 세그먼트 URL 추출
                if (line.startsWith("#EXTINF:")) {
                    let result = lines[i].match(/:(.*?),/);
                    totalTime += parseFloat(result[1]);
                    const segmentUrl = baseURL + lines[i + 1];
                    segmentUrls.push(segmentUrl);
                }
            }
        });
    return {segmentUrls, totalTime};

}
export { getResolutionList, getSegmentUrlList }