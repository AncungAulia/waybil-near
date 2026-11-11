import { bootstrap } from "./lib/bootstrap";
const { runtime } = bootstrap();
console.log(JSON.stringify(await runtime.credit.tick()));
