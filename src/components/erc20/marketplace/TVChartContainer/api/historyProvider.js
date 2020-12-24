var rp = require("request-promise").defaults({ json: true });
const proxy = "";
const api_root = "https://mmcors.autonio.foundation/http://18.188.255.60:3000/v2"
const history = {};

export default {
  history: history,

  getBars: function(symbolInfo, resolution, from, to, first, limit) {
    var split_symbol = symbolInfo.name.split(/[:/]/);
    const url = "/history";
    const qs = {
      // baseAssetData: '0xf47261b0000000000000000000000000fe4f5145f6e09952a5ba9e956ed0c25e3fa4c7f1',
      // quoteAssetData: '0xf47261b0000000000000000000000000d0f219e2e0bb6d3b3d7fd8e2b141114932979478',
      // networkId: '80001',
      base_token: split_symbol[0].toLowerCase(),
      quote_token: split_symbol[1].toLowerCase(),
      from: from * 1000,
      to: to * 1000,
      interval: resolution == "D" ? 86400000 : parseInt(resolution) * 60000,
      // limit: limit ? limit : 2000
      // aggregate: 1//resolution
    };

    return rp({
      url: `${api_root}${url}`,
      qs
    }).then(data => {
      // if (data.Response && data.Response === 'Error') {
      // 	console.log('CryptoCompare API error:',data.Message)
      // 	return []
      // }
      if (data.length) {
        var bars = data.map(el => {
          return {
            time: el.time, //TradingView requires bar time in ms
            low: el.low,
            high: el.high,
            open: el.open,
            close: el.close,
            volume: el.volume
          };
        });
        if (first) {
          var lastBar = bars[bars.length - 1];
          history[symbolInfo.name] = { lastBar: lastBar };
        }
        return bars;
      } else {
        return [];
      }
    });
  }
};
