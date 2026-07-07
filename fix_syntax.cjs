const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I need to add </motion.div> before `)}` that closes the home tab.
// Let's find the string:
//                   </div>
//               )}
//               </AnimatePresence>

code = code.replace(
`                  </div>
              )}
            </AnimatePresence>`,
`                  </div>
              </motion.div>
            )}
            </AnimatePresence>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Syntax fixed");
