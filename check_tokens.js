const https = require('https');

const PUMP_API = "https://frontend-api.pump.fun/coins?offset=0&limit=200&sort=market_cap&order=DESC&includeNsfw=false";
const MIN_MCAP = 200_000;      // $200k USD
const MIN_AGE_HOURS = 24;
const MIN_AGE_SECONDS = MIN_AGE_HOURS * 60 * 60;

https.get(PUMP_API, {
  headers: {
    "Accept": "application/json",
    "User-Agent": "PumpDraft/1.0"
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      let coins = Array.isArray(parsed) ? parsed : parsed?.coins || [];
      const nowSeconds = Math.floor(Date.now() / 1000);
      const cutoff = nowSeconds - MIN_AGE_SECONDS;
      
      const filtered = coins.filter(coin => {
        const mcap = coin.usd_market_cap || 0;
        const created = coin.created_timestamp || nowSeconds;
        return mcap >= MIN_MCAP && created <= cutoff;
      }).slice(0, 10);
      
      console.log(JSON.stringify(filtered.map(c => c.symbol), null, 2));
    } catch(err) {
      console.error(err.message);
    }
  });
}).on('error', err => {
  console.error("Error: ", err.message);
});
