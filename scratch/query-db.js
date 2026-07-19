const https = require('https');

function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Node)',
      'Content-Type': 'application/json',
      ...options.headers
    };

    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: headers
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          json: () => {
            try {
              return Promise.resolve(JSON.parse(data));
            } catch (e) {
              return Promise.resolve(data ? { raw: data } : {});
            }
          }
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function main() {
  try {
    const res = await safeFetch('https://oaapnglvbkvxyydjnmun.supabase.co/functions/v1/send-reminders', {
      method: 'POST'
    });
    console.log("Reminders Edge Function Status:", res.status);
    console.log("Reminders Edge Function Body:", await res.json());
  } catch (err) {
    console.error(err);
  }
}

main();
