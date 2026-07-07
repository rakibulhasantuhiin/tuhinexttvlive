import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  'import { supabase } from "./lib/supabase";',
  'import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";\nimport { db } from "./lib/firebase";'
);

// We have helper function to replace specific patterns.
// But some of them span multiple lines.

// Replace fetchRegisteredUsers
content = content.replace(
`    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "registered_users")
      .maybeSingle();`,
`    const docSnap = await getDoc(doc(db, "settings", "registered_users"));
    const data = docSnap.exists() ? docSnap.data() : null;
    const error = null;`
);

// Replace saveRegisteredUsers
content = content.replace(
`    const { error } = await supabase
      .from("settings")
      .upsert({ key: "registered_users", value: JSON.stringify(users) }, { onConflict: "key" });`,
`    await setDoc(doc(db, "settings", "registered_users"), { value: JSON.stringify(users) }, { merge: true });
    const error = null;`
);

// Replace playlist load
content = content.replace(
`          const { data } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "playlist_url")
            .maybeSingle();`,
`          const docSnap = await getDoc(doc(db, "settings", "playlist_url"));
          const data = docSnap.exists() ? docSnap.data() : null;`
);

content = content.replace(
`              try {
                await supabase
                  .from("settings")
                  .upsert({ key: "playlist_url", value: PLAYLIST_URL }, { onConflict: "key" });
              } catch (e) {`,
`              try {
                await setDoc(doc(db, "settings", "playlist_url"), { value: PLAYLIST_URL }, { merge: true });
              } catch (e) {`
);

content = content.replace(
`          const { data: customChannelsData } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "custom_channels")
            .maybeSingle();`,
`          const docSnap = await getDoc(doc(db, "settings", "custom_channels"));
          const customChannelsData = docSnap.exists() ? docSnap.data() : null;`
);

content = content.replace(
`          const { data: dbBanner } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "banner_image_url")
            .maybeSingle();`,
`          const docSnap = await getDoc(doc(db, "settings", "banner_image_url"));
          const dbBanner = docSnap.exists() ? docSnap.data() : null;`
);

content = content.replace(
`          const { data: dbHideAll } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "hide_all_channels")
            .maybeSingle();`,
`          const docSnap = await getDoc(doc(db, "settings", "hide_all_channels"));
          const dbHideAll = docSnap.exists() ? docSnap.data() : null;`
);

// the polling effect
content = content.replace(
`        const { data: customChannelsData } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "custom_channels")
          .maybeSingle();`,
`        const docSnap = await getDoc(doc(db, "settings", "custom_channels"));
        const customChannelsData = docSnap.exists() ? docSnap.data() : null;`
);

content = content.replace(
`        const { data: dbBanner } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "banner_image_url")
          .maybeSingle();`,
`        const docSnap = await getDoc(doc(db, "settings", "banner_image_url"));
        const dbBanner = docSnap.exists() ? docSnap.data() : null;`
);

content = content.replace(
`        const { data: dbHideAll } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "hide_all_channels")
          .maybeSingle();`,
`        const docSnap = await getDoc(doc(db, "settings", "hide_all_channels"));
        const dbHideAll = docSnap.exists() ? docSnap.data() : null;`
);

// skip M3U block
content = content.replace(
`        const { data: customChannelsData } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "custom_channels")
          .maybeSingle();`,
`        const docSnap = await getDoc(doc(db, "settings", "custom_channels"));
        const customChannelsData = docSnap.exists() ? docSnap.data() : null;`
);

content = content.replace(
`          const { data, error: sbError } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "playlist_url")
            .maybeSingle();`,
`          const docSnap = await getDoc(doc(db, "settings", "playlist_url"));
          const data = docSnap.exists() ? docSnap.data() : null;
          const sbError = null;`
);

content = content.replace(
`        const { error: sbError } = await supabase
          .from("settings")
          .upsert({ key: "playlist_url", value: trimmed }, { onConflict: "key" });`,
`        await setDoc(doc(db, "settings", "playlist_url"), { value: trimmed }, { merge: true });
        const sbError = null;`
);

content = content.replace(
`        await supabase.from("settings").delete().eq("key", "custom_channels");`,
`        await deleteDoc(doc(db, "settings", "custom_channels"));`
);

content = content.replace(
`      const { error: sbError } = await supabase
        .from("settings")
        .upsert({ key: "custom_channels", value: JSON.stringify(updated) }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updated) }, { merge: true });
      const sbError = null;`
);
content = content.replace(
`      const { error: sbError } = await supabase
        .from("settings")
        .upsert({ key: "custom_channels", value: JSON.stringify(updated) }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updated) }, { merge: true });
      const sbError = null;`
);
content = content.replace(
`      const { error: sbError } = await supabase
        .from("settings")
        .upsert({ key: "custom_channels", value: JSON.stringify(updated) }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updated) }, { merge: true });
      const sbError = null;`
);
content = content.replace(
`      const { error: sbError } = await supabase
        .from("settings")
        .upsert({ key: "custom_channels", value: JSON.stringify(updated) }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updated) }, { merge: true });
      const sbError = null;`
);
content = content.replace(
`      const { error: sbError } = await supabase
        .from("settings")
        .upsert({ key: "custom_channels", value: JSON.stringify(updated) }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "custom_channels"), { value: JSON.stringify(updated) }, { merge: true });
      const sbError = null;`
);

content = content.replace(
`      await supabase
        .from("settings")
        .upsert({ key: "banner_image_url", value: url }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "banner_image_url"), { value: url }, { merge: true });`
);

content = content.replace(
`      await supabase
        .from("settings")
        .upsert({ key: "hide_all_channels", value: String(hide) }, { onConflict: "key" });`,
`      await setDoc(doc(db, "settings", "hide_all_channels"), { value: String(hide) }, { merge: true });`
);

content = content.replace(
`    // 1. Subscribe to Realtime Postgres DB changes in Supabase 'settings' table or fallback
    const channel = supabase
      .channel('schema-settings-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
        },
        (payload: any) => {
          console.log('Realtime settings update received:', payload);
          if (payload.new && payload.new.key) {
            const key = payload.new.key;
            const value = payload.new.value;
            if (key === 'custom_channels') {
              try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                  setChannels(parsed);
                  localStorage.setItem("tuhinext_channels", value);
                  
                  // Keep active channel selection in check
                  setActiveChannel((curr) => {
                    if (curr) {
                      const exists = parsed.find((c) => c.id === curr.id);
                      if (!exists) return parsed.length > 0 ? parsed[0] : null;
                    }
                    return curr;
                  });
                }
              } catch (err) {
                console.error("Error updates realtime channels:", err);
              }
            } else if (key === 'banner_image_url') {
              setBannerImageUrl(value || "");
              setBannerInput(value || "");
              localStorage.setItem("tuhinext_banner_image_url", value || "");
            } else if (key === 'hide_all_channels') {
              const hVal = value === 'true';
              setHideAllChannels(hVal);
              localStorage.setItem("tuhinext_hide_all_channels", String(hVal));
            }
          }
        }
      )
      .subscribe();`,
`    const unsubChannels = onSnapshot(doc(db, "settings", "custom_channels"), (docSnap) => {
      if (docSnap.exists()) {
        const value = docSnap.data().value;
         try {
           const parsed = JSON.parse(value);
           if (Array.isArray(parsed)) {
             setChannels(parsed);
             localStorage.setItem("tuhinext_channels", value);
             setActiveChannel((curr) => {
               if (curr) {
                 const exists = parsed.find((c: any) => c.id === curr.id);
                 if (!exists) return parsed.length > 0 ? parsed[0] : null;
               }
               return curr;
             });
           }
         } catch (err) {}
      }
    });

    const unsubBanner = onSnapshot(doc(db, "settings", "banner_image_url"), (docSnap) => {
      if (docSnap.exists()) {
        const value = docSnap.data().value;
        setBannerImageUrl(value || "");
        setBannerInput(value || "");
        localStorage.setItem("tuhinext_banner_image_url", value || "");
      }
    });

    const unsubHide = onSnapshot(doc(db, "settings", "hide_all_channels"), (docSnap) => {
      if (docSnap.exists()) {
        const value = docSnap.data().value;
        const hVal = value === 'true';
        setHideAllChannels(hVal);
        localStorage.setItem("tuhinext_hide_all_channels", String(hVal));
      }
    });`
);

content = content.replace(
`    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };`,
`    return () => {
      unsubChannels();
      unsubBanner();
      unsubHide();
      clearInterval(intervalId);
    };`
);

fs.writeFileSync('src/App.tsx', content);
