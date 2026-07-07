const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
`                </div>
            )}
            </AnimatePresence>`,
`                </div>
              </motion.div>
            )}
            </AnimatePresence>`
);

fs.writeFileSync('src/App.tsx', code);
