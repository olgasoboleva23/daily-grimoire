// Set up the browser document before shared entry points load Vue in this test process.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
