import f1wk1 from "./rider-foundation-1-wk1.js";
import f1wk3 from "./rider-foundation-1-wk3.js";
import f1wk8 from "./rider-foundation-1-wk8.js";
import f2wk1 from "./rider-foundation-2-wk1.js";
import f2wk4 from "./rider-foundation-2-wk4.js";
import f2wk7 from "./rider-foundation-2-wk7.js";
import f3wk2 from "./rider-foundation-3-wk2.js";
import f3wk4 from "./rider-foundation-3-wk4.js";
import f3wk7 from "./rider-foundation-3-wk7.js";
import f4wk2 from "./rider-foundation-4-wk2.js";
import f4wk3 from "./rider-foundation-4-wk3.js";
import f4wk8 from "./rider-foundation-4-wk8.js";
import sb1 from "./rider-symmetry-and-balance-1.js";
import sb2 from "./rider-symmetry-and-balance-2.js";
import build1 from "./rider-build-1.js";
import build2 from "./rider-build-2.js";

export const RIDER_STRENGTH_SCHEDULE = {
  name: "Rider Strength",
  weeks: [
    { week: 1,  theme: "Foundation",         workouts: [f1wk1, sb1,    f2wk1, build1] },
    { week: 2,  theme: "Foundation",         workouts: [f3wk2, sb2,    f4wk2, build2] },
    { week: 3,  theme: "Build",              workouts: [f1wk3, build1, f4wk3, build2] },
    { week: 4,  theme: "Symmetry & Balance", workouts: [f2wk4, sb1,    f3wk4, sb2]   },
    { week: 5,  theme: "Foundation",         workouts: [f1wk3, sb1,    f2wk1, build1] },
    { week: 6,  theme: "Foundation",         workouts: [f3wk2, sb2,    f4wk2, build2] },
    { week: 7,  theme: "Build",              workouts: [f2wk7, build1, f3wk7, build2] },
    { week: 8,  theme: "Symmetry & Balance", workouts: [f1wk8, sb1,    f4wk8, sb2]   },
    { week: 9,  theme: "Foundation",         workouts: [f1wk1, sb1,    f2wk1, build1] },
    { week: 10, theme: "Foundation",         workouts: [f3wk2, sb2,    f4wk2, build2] },
    { week: 11, theme: "Build",              workouts: [f1wk3, build1, f4wk3, build2] },
    { week: 12, theme: "Symmetry & Balance", workouts: [f2wk7, sb1,    f3wk4, sb2]   },
  ],
};
