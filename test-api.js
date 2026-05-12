const ARCSCAN_BASE = "https://testnet.arcscan.app/api/v2";
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

async function fetchAgents(cursor) {
  const url = new URL(`${ARCSCAN_BASE}/tokens/${IDENTITY_REGISTRY}/instances`);
  if (cursor) url.searchParams.set("unique_token", String(cursor));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ArcScan API error: ${res.status}`);
  return res.json();
}

async function fetchAllAgents() {
  const all = [];
  let cursor;
  let page = 0;
  const MAX_PAGES = 50;
  
  do {
    try {
      const data = await fetchAgents(cursor);
      all.push(...data.items);
      cursor = data.next_page_params?.unique_token ?? undefined;
      page++;
      console.log(`Fetched page ${page}, total items: ${all.length}, next cursor: ${cursor}`);
    } catch(e) {
      console.error("Error at page", page+1, e);
      break;
    }
  } while (cursor && page < MAX_PAGES);

  return all;
}

fetchAllAgents().then(data => console.log("Done. Total:", data.length));
