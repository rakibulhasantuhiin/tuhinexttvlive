const fs = require('fs');
let channels = [];
try {
  channels = JSON.parse(fs.readFileSync('channels.json', 'utf8'));
} catch (e) {}

const workingChannel = {
  id: "test-working-hls-12345",
  name: "Test Working Stream",
  logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Broadcasting-icon.svg/512px-Broadcasting-icon.svg.png",
  url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  isHidden: false,
  order: -1
};

if (!channels.find(c => c.url === workingChannel.url)) {
  channels.unshift(workingChannel);
  fs.writeFileSync('channels.json', JSON.stringify(channels, null, 2));
}
