import dashjs from 'dashjs';
console.log("dashjs default:", Object.keys(dashjs || {}));
import * as dashjsAll from 'dashjs';
console.log("dashjs all:", Object.keys(dashjsAll || {}));
