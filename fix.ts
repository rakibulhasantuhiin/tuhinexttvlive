import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
`        const docSnap = await getDoc(doc(db, "settings", "custom_channels"));
        const customChannelsData = docSnap.exists() ? docSnap.data() : null;`,
`        let customChannelsData = null;
        {
          const docSnap = await getDoc(doc(db, "settings", "custom_channels"));
          customChannelsData = docSnap.exists() ? docSnap.data() : null;
        }`
);

content = content.replace(
`        const docSnap = await getDoc(doc(db, "settings", "banner_image_url"));
        const dbBanner = docSnap.exists() ? docSnap.data() : null;`,
`        let dbBanner = null;
        {
          const docSnap = await getDoc(doc(db, "settings", "banner_image_url"));
          dbBanner = docSnap.exists() ? docSnap.data() : null;
        }`
);

content = content.replace(
`        const docSnap = await getDoc(doc(db, "settings", "hide_all_channels"));
        const dbHideAll = docSnap.exists() ? docSnap.data() : null;`,
`        let dbHideAll = null;
        {
          const docSnap = await getDoc(doc(db, "settings", "hide_all_channels"));
          dbHideAll = docSnap.exists() ? docSnap.data() : null;
        }`
);

content = content.replace(
`          const docSnap = await getDoc(doc(db, "settings", "playlist_url"));
          const data = docSnap.exists() ? docSnap.data() : null;`,
`          let data = null;
          {
            const docSnap = await getDoc(doc(db, "settings", "playlist_url"));
            data = docSnap.exists() ? docSnap.data() : null;
          }`
);

fs.writeFileSync('src/App.tsx', content);
