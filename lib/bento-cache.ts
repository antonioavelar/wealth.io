import { BentoCache, bentostore } from "bentocache";
import { fileDriver } from "bentocache/drivers/file";

const bento = new BentoCache({
  default: "myCache",
  stores: {
    // A first cache store named "myCache" using
    // only L1 in-memory cache
    myCache: bentostore().useL2Layer(
      fileDriver({ directory: "./cache", pruneInterval: 60 * 60 * 1000 })
    ),
  },
});

bento.on("cache:hit", (data) => {
  console.log(`Cache hit for key: ${data.key}`);
});

export const bentoCache = bento;
