const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-CVlyl5kh.js","assets/index-BxvBY8V-.js","assets/index-Ks6JCAj8.css"])))=>i.map(i=>d[i]);
import { l as registerPlugin, _ as __vitePreload } from "./index-BxvBY8V-.js";
const Device = registerPlugin("Device", {
  web: () => __vitePreload(() => import("./web-CVlyl5kh.js"), true ? __vite__mapDeps([0,1,2]) : void 0).then((m) => new m.DeviceWeb())
});
export {
  Device
};
