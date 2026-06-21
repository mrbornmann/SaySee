import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Error Boundary ───────────────────────────────────────────────
import React from "react";
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(e){ return {error:e}; }
  render(){
    if(this.state.error) return(
      <div style={{padding:40,fontFamily:"Arial",background:"#fff",minHeight:"100vh"}}>
        <h2 style={{color:"red",marginBottom:16}}>SaySee Error</h2>
        <pre style={{background:"#f5f5f5",padding:16,borderRadius:8,fontSize:12,overflow:"auto",whiteSpace:"pre-wrap"}}>{String(this.state.error)}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:20,padding:"10px 24px",background:"#1B65B8",color:"#fff",border:"none",borderRadius:8,fontSize:14,cursor:"pointer"}}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

// ── SaySee Logo components ───────────────────────────────────────
// SVG eye icon — speech bubble eye shape
function SaySeeIcon({size=44, bg="white"}){
  const catchlightColor = bg==="blue" ? "#2265AD" : "#ffffff";
  const tailPath = bg==="blue"
    ? "M11 34 L4 46 L22 34"
    : "M13 34 L6 44 L21 34";
  return(
    <svg width={size} height={size*0.88} viewBox="0 0 50 44">
      <path d="M25 6 Q42 6 48 20 Q42 34 25 34 Q8 34 2 20 Q8 6 25 6Z"
        fill="none" stroke="#5AAB2A" strokeWidth="2" strokeLinecap="round"/>
      <path d={tailPath} fill="#5AAB2A"/>
      <circle cx="25" cy="20" r="10" fill="none" stroke="#5AAB2A" strokeWidth="2"/>
      <circle cx="25" cy="20" r="4.5" fill="#5AAB2A"/>
      <circle cx="28.5" cy="17" r="1.6" fill={catchlightColor}/>
    </svg>
  );
}

// Header logo — icon + wordmark side by side
function SaySeeLogo({size=36}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
      <SaySeeIcon size={size} bg="white"/>
      <span style={{fontFamily:"'Fredoka One',cursive",fontSize:size*0.72,color:"#5AAB2A",letterSpacing:0.5,lineHeight:1}}>SaySee</span>
    </div>
  );
}

// Full logo for login/loading screens
function SaySeeFullLogo({size=160}){
  const fontSize = size*0.36;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <SaySeeIcon size={size*0.7} bg="blue"/>
      <span style={{fontFamily:"'Fredoka One',cursive",fontSize:fontSize,color:"#5AAB2A",letterSpacing:1,lineHeight:1}}>SaySee</span>
      <span style={{fontFamily:"'Nunito',sans-serif",fontSize:fontSize*0.33,color:"rgba(255,255,255,0.85)",letterSpacing:3,fontWeight:700,textTransform:"uppercase"}}>AAC Visual Learning</span>
    </div>
  );
}

// Banner alias
function SaySeeBanner({height=50}){
  return <SaySeeLogo size={height}/>;
}

// ── Built-in Reinforcer Library ──────────────────────────────────
const REINFORCERS = [
  // Edibles
  {id:"chips",      label:"Chips",        emoji:"🥔", category:"edible"},
  {id:"goldfish",   label:"Goldfish",     emoji:"🐟", category:"edible"},
  {id:"cheeseballs",label:"Cheese Balls", emoji:"🧀", category:"edible"},
  {id:"candy",      label:"Candy",        emoji:"🍬", category:"edible"},
  {id:"cookie",     label:"Cookie",       emoji:"🍪", category:"edible"},
  {id:"crackers",   label:"Crackers",     emoji:"🫙", category:"edible"},
  {id:"popcorn",    label:"Popcorn",      emoji:"🍿", category:"edible"},
  {id:"fruit",      label:"Fruit",        emoji:"🍓", category:"edible"},
  {id:"juice",      label:"Juice",        emoji:"🧃", category:"edible"},
  {id:"pretzels",   label:"Pretzels",     emoji:"🥨", category:"edible"},
  // Activities
  {id:"tablet",     label:"Tablet",       emoji:"📱", category:"activity"},
  {id:"youtube",    label:"YouTube",      emoji:"▶️",  category:"activity"},
  {id:"music",      label:"Music",        emoji:"🎵", category:"activity"},
  {id:"game",       label:"Game",         emoji:"🎮", category:"activity"},
  {id:"break",      label:"Break",        emoji:"⏸️",  category:"activity"},
  {id:"walk",       label:"Walk",         emoji:"🚶", category:"activity"},
  {id:"outside",    label:"Outside",      emoji:"🌳", category:"activity"},
  {id:"movie",      label:"Movie",        emoji:"🎬", category:"activity"},
  {id:"drawing",    label:"Drawing",      emoji:"✏️",  category:"activity"},
  {id:"reading",    label:"Book",         emoji:"📚", category:"activity"},
  // Tangibles
  {id:"puzzle",     label:"Puzzle",       emoji:"🧩", category:"tangible"},
  {id:"toy",        label:"Toy",          emoji:"🧸", category:"tangible"},
  {id:"ball",       label:"Ball",         emoji:"⚽", category:"tangible"},
  {id:"bubbles",    label:"Bubbles",      emoji:"🫧", category:"tangible"},
  {id:"fidget",     label:"Fidget",       emoji:"🌀", category:"tangible"},
  {id:"slime",      label:"Slime",        emoji:"🟢", category:"tangible"},
];

// ── Supabase connection ───────────────────────────────────────────
const SUPABASE_URL = "https://peuuimpaylmprjrnnkqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldXVpbXBheWxtcHJqcm5ua3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDk5MzMsImV4cCI6MjA5NjAyNTkzM30.MBQbempSUsYAWlacXLCqe7qVr6ssA4B4uS5QOiJMaF0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'saysee-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    detectSessionInUrl: false,
  }
});

// Listen for auth state changes — auto-restore session
if(supabase){
  supabase.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_OUT'){
      try { localStorage.removeItem('saysee_session'); } catch(e){}
    }
  });
}

// ── Auth helpers ──────────────────────────────────────────────────
const sbAuth = {
  signUp: async (email, password, name, plan) => {
    if (!supabase) throw new Error("Not connected");
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, plan, role:"teacher" } } });
    if (error) throw error;
    if (data.user) await supabase.from("accounts").insert({ id:data.user.id, email, name, role:"teacher", created_at:new Date().toISOString() });
    return data;
  },
  signIn: async (email, password) => {
    if (!supabase) throw new Error("Not connected");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await supabase.from("accounts").update({ last_login:new Date().toISOString() }).eq("id", data.user.id);
    return data;
  },
  signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  getSession: async () => { if (!supabase) return null; const { data } = await supabase.auth.getSession(); return data.session; },
  getAccount: async (userId) => { if (!supabase) return null; const { data } = await supabase.from("accounts").select("*").eq("id", userId).single(); return data; },

  // ── Photos ────────────────────────────────────────────────────
  // Upload photo to Supabase Storage and save URL to photos table
  uploadPhoto: async (wordId, userId, dataUrl) => {
    if (!supabase) return null;
    try {
      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const path = `${userId}/${wordId}.${ext}`;

      // Upload to storage bucket
      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(path, blob, { upsert: true, contentType: blob.type });

      if(upErr) throw upErr;

      // Generate signed URL — private bucket, 1 hour expiry
      const { data: signedData } = await supabase.storage
        .from('photos')
        .createSignedUrl(path, 604800);
      const signedUrl = signedData?.signedUrl;

      // Save storage path reference in photos table
      await supabase.from('photos').upsert({
        word_id: String(wordId),
        owner_id: userId,
        storage_path: path,
        public_url: path,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'word_id,owner_id' });

      return signedUrl;
    } catch(e) {
      console.log("Photo upload error:", e);
      return null;
    }
  },

  // Load all photos for a user — generate fresh signed URLs
getPhotos: async (userId) => {
    if (!supabase) return {};

    // Sign a set of photo rows into a { word_id: signedUrl } map
    const signRows = async (rows) => {
      const m = {};
      await Promise.all((rows || []).map(async p => {
        const storagePath = p.storage_path || p.public_url;
        if(!storagePath) return;
        try {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(storagePath, 604800); // 7-day expiry
          if(signed?.signedUrl){
            m[p.word_id] = signed.signedUrl;
          }
        } catch(e) {
          console.log('Signed URL error for', p.word_id, e);
        }
      }));
      return m;
    };

    // Admin defaults (owner_id IS NULL) are the shared base pool;
    // this teacher's own uploads (owner_id = userId) override them per word.
    const [defRes, ownRes] = await Promise.all([
      supabase.from('photos').select('word_id, public_url, storage_path').is('owner_id', null),
      supabase.from('photos').select('word_id, public_url, storage_path').eq('owner_id', userId),
    ]);
    const defaults = await signRows(defRes.data);
    const own      = await signRows(ownRes.data);
    return { ...defaults, ...own }; // teacher's own photo wins over the admin default
  },

  // Delete a photo
  deletePhoto: async (wordId, userId) => {
    if (!supabase) return;
    const { data } = await supabase.from('photos')
      .select('storage_path').eq('word_id', String(wordId)).eq('owner_id', userId).single();
    if(data?.storage_path){
      await supabase.storage.from('photos').remove([data.storage_path]);
    }
    await supabase.from('photos').delete()
      .eq('word_id', String(wordId)).eq('owner_id', userId);
  },

  // ── Students ──────────────────────────────────────────────────
  getStudents: async (userId) => {
    if (!supabase) return null;
    const { data } = await supabase.from("students")
      .select("*").eq("teacher_id", userId).order("created_at");
    return data;
  },
  saveStudent: async (student, userId) => {
    if (!supabase) return null;
    const row = {
      id: student.id?.startsWith("s_") ? undefined : student.id,
      teacher_id: userId,
      name: student.name,
      avatar: student.avatar,
      color: student.color,
      starting_level: student.level || 1,
      created_at: new Date().toISOString(),
    };
    // upsert — insert or update
    const { data } = await supabase.from("students")
      .upsert({...row, id: student.supabaseId || undefined})
      .select().single();
    return data;
  },
  deleteStudent: async (supabaseId) => {
    if (!supabase) return;
    await supabase.from("students").delete().eq("id", supabaseId);
  },

  // ── Progress / Trial Data ──────────────────────────────────────
  getProgress: async (userId) => {
    if (!supabase) return null;
    const { data } = await supabase.from("student_progress")
      .select("*").eq("teacher_id", userId);
    return data;
  },
  saveProgress: async (studentId, wordId, level, correct, incorrect, teacherId) => {
    if (!supabase) return;
    await supabase.from("student_progress").upsert({
      student_id: studentId,
      word_id: String(wordId),
      teacher_id: teacherId,
      level,
      correct_count: correct,
      incorrect_count: incorrect,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id,word_id" });
  },

  // ── Custom Words ──────────────────────────────────────────────
  // Load all custom words for a user (teacher or district)
  getCustomWords: async (userId, districtId=null) => {
    if (!supabase) return [];
    let query = supabase.from("custom_words").select("*").eq("owner_id", userId);
    const { data: userWords } = await query;
    let districtWords = [];
    if(districtId){
      const { data: dw } = await supabase.from("custom_words").select("*").eq("district_id", districtId).is("user_id", null);
      districtWords = dw || [];
    }
    return [...(userWords||[]), ...districtWords];
  },

  // Save a custom word
  saveCustomWord: async (word, userId, districtId=null) => {
    if (!supabase) return null;
    const row = {
      owner_id: districtId ? null : userId,
      district_id: districtId || null,
      word: word.word,
      display: word.display,
      emoji: word.emoji,
      photo_hint: word.photo,
      color: word.color,
      category: word.cat,
      triggers: word.triggers || [word.word],
      created_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("custom_words").insert(row).select().single();
    return data;
  },

  // Delete a custom word
  deleteCustomWord: async (wordId) => {
    if (!supabase) return;
    await supabase.from("custom_words").delete().eq("id", wordId);
  },

  // Load custom categories for a user
  getCustomCats: async (userId, districtId=null) => {
    if (!supabase) return [];
    const { data: userCats } = await supabase.from("custom_words")
      .select("category").eq("owner_id", userId).neq("category","custom");
    let districtCats = [];
    if(districtId){
      const { data: dc } = await supabase.from("custom_words")
        .select("category").eq("district_id", districtId).is("user_id", null);
      districtCats = dc || [];
    }
    return [...(userCats||[]), ...districtCats];
  },
};

// ── Data helpers ──────────────────────────────────────────────────
const sbData = {
  getStudents: async (tid) => { if (!supabase) return []; const { data } = await supabase.from("students").select("*").eq("teacher_id", tid).order("created_at"); return data||[]; },
  saveStudent: async (s) => { if (!supabase) return s; const { data } = await supabase.from("students").upsert(s).select().single(); return data; },
  deleteStudent: async (id) => { if (supabase) await supabase.from("students").delete().eq("id", id); },
  getProgress: async (sid) => {
    if (!supabase) return {};
    const { data } = await supabase.from("student_progress").select("*").eq("student_id", sid);
    const p = {}; (data||[]).forEach(r=>{ p[r.word_id]=true; }); return p;
  },
  markLearned: async (sid, wid, env="school") => {
    if (!supabase) return;
    await supabase.from("student_progress").upsert({ student_id:sid, word_id:String(wid), learned:true, date_learned:new Date().toISOString(), environment:env, word_source:"master" });
  },
  getWords: async () => { if (!supabase) return []; const { data } = await supabase.from("words").select("*").eq("is_active", true).order("category"); return data||[]; },
  getCustomWords: async (tid) => { if (!supabase) return []; const { data } = await supabase.from("custom_words").select("*").eq("teacher_id", tid); return data||[]; },
  saveCustomWord: async (w) => { if (!supabase) return w; const { data } = await supabase.from("custom_words").insert(w).select().single(); return data; },
  deleteCustomWord: async (id) => { if (supabase) await supabase.from("custom_words").delete().eq("id", id); },
  uploadPhoto: async (tid, wid, sid, dataUrl) => {
    if (!supabase) return null;
    const res = await fetch(dataUrl); const blob = await res.blob();
    const path = `${tid}/${wid}_${sid||"shared"}_${Date.now()}.jpg`;
    await supabase.storage.from("photos").upload(path, blob, { upsert:true });
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    await supabase.from("photos").upsert({ word_id:String(wid), student_id:sid, teacher_id:tid, storage_url:data.publicUrl });
    return data.publicUrl;
  },
  getPhoto: async (tid, wid) => {
    if (!supabase) return null;
    const { data } = await supabase.from("photos").select("storage_url").eq("teacher_id", tid).eq("word_id", String(wid)).maybeSingle();
    return data?.storage_url||null;
  },
  getDistrictTeachers: async (did) => { if (!supabase) return []; const { data } = await supabase.from("accounts").select("*").eq("district_id", did).eq("role","teacher"); return data||[]; },
  getDistrictStudents: async (did) => { if (!supabase) return []; const { data } = await supabase.from("students").select("*").eq("district_id", did); return data||[]; },
  getLicenses: async (did) => { if (!supabase) return []; const { data } = await supabase.from("licenses").select("*").eq("district_id", did); return data||[]; },
  assignLicense: async (lid, tid) => { if (supabase) await supabase.from("licenses").update({ assigned_to_teacher_id:tid, status:"active", assigned_date:new Date().toISOString() }).eq("id", lid); }
};

// ── In-memory fallback for artifact preview ───────────────────────
let _store = {};
const mem = { get:(k,fb)=>k in _store?_store[k]:fb, set:(k,v)=>{_store[k]=v;} };

// ── Data ─────────────────────────────────────────────────────────
const MASTER_WORDS = [
  {id:1, cat:"core",      word:"stop",       display:"STOP",         emoji:"🛑", photo:"stop sign red street",            color:"#1B65B8", triggers:["stop","stop it","freeze"]},
  {id:2, cat:"core",      word:"sit down",   display:"SIT DOWN",     emoji:"🪑", photo:"child sitting chair classroom",    color:"#D63031", triggers:["sit","sit down","have a seat"]},
  {id:3, cat:"core",      word:"line up",    display:"LINE UP",      emoji:"🚶", photo:"children standing in line school", color:"#E17055", triggers:["line up","get in line","lineup"]},
  {id:4, cat:"core",      word:"outside",    display:"OUTSIDE",      emoji:"🌤️",  photo:"children playing outside school",  color:"#5AAB2A", triggers:["outside","go outside"]},
  {id:5, cat:"core",      word:"recess",     display:"RECESS",       emoji:"🛝", photo:"children playground recess",       color:"#00CEC9", triggers:["recess","playground","go to recess"]},
  {id:6, cat:"core",      word:"restroom",   display:"RESTROOM",     emoji:"🚻", photo:"school restroom door sign",        color:"#1B65B8", triggers:["restroom","bathroom","go to the bathroom"]},
  {id:7, cat:"core",      word:"snack time", display:"SNACK TIME",   emoji:"🍎", photo:"child eating snack classroom",     color:"#FDCB6E", triggers:["snack","snack time","eat your snack"]},
  {id:8, cat:"core",      word:"lunch time", display:"LUNCH TIME",   emoji:"🥪", photo:"school cafeteria lunch children",  color:"#E67E22", triggers:["lunch","lunch time","time for lunch"]},
  {id:9, cat:"core",      word:"help",       display:"HELP",         emoji:"🤝", photo:"helping hands together",           color:"#A29BFE", triggers:["help","i need help","help me"]},
  {id:10,cat:"core",      word:"done",       display:"DONE",         emoji:"✅", photo:"finished checkmark complete",      color:"#6C5CE7", triggers:["done","all done","finished"]},
  {id:11,cat:"classroom", word:"listen",     display:"LISTEN",       emoji:"👂", photo:"child listening teacher",          color:"#1B65B8", triggers:["listen","listen up","pay attention"]},
  {id:12,cat:"classroom", word:"raise hand", display:"RAISE HAND",   emoji:"✋", photo:"student raising hand classroom",   color:"#74B9FF", triggers:["raise your hand","hands up"]},
  {id:13,cat:"classroom", word:"quiet",      display:"QUIET",        emoji:"🤫", photo:"quiet shush finger lips",          color:"#55EFC4", triggers:["quiet","be quiet","shhh"]},
  {id:14,cat:"classroom", word:"walk",       display:"WALK",         emoji:"🚶", photo:"child walking hallway school",     color:"#5AAB2A", triggers:["walk","walking feet"]},
  {id:15,cat:"classroom", word:"clean up",   display:"CLEAN UP",     emoji:"🧹", photo:"children cleaning classroom",      color:"#8E44AD", triggers:["clean up","tidy up","pick up"]},
  {id:16,cat:"classroom", word:"work time",  display:"WORK TIME",    emoji:"📝", photo:"student working desk classroom",   color:"#2C3E50", triggers:["work time","time to work"]},
  {id:17,cat:"library",   word:"reading",    display:"READING TIME", emoji:"📖", photo:"child reading book library",       color:"#8E44AD", triggers:["reading","reading time","story time"]},
  {id:18,cat:"library",   word:"book",       display:"BOOK",         emoji:"📚", photo:"colorful children books shelf",    color:"#9B59B6", triggers:["book","get a book"]},
  {id:19,cat:"library",   word:"sit quietly",display:"SIT QUIETLY",  emoji:"🧘", photo:"child sitting quietly reading",    color:"#6C3483", triggers:["sit quietly","sit quiet"]},
  {id:20,cat:"recess",    word:"play",       display:"PLAY",         emoji:"🎉", photo:"children playing together happy",  color:"#5AAB2A", triggers:["play","time to play"]},
  {id:21,cat:"recess",    word:"slide",      display:"SLIDE",        emoji:"🛝", photo:"child playground slide",           color:"#5AAB2A", triggers:["slide","go down the slide"]},
  {id:22,cat:"recess",    word:"swing",      display:"SWING",        emoji:"🪁", photo:"child on playground swing",        color:"#1E8449", triggers:["swing","swings"]},
  {id:23,cat:"recess",    word:"ball",       display:"BALL",         emoji:"⚽", photo:"colorful playground ball",         color:"#F1C40F", triggers:["ball","kick the ball"]},
  {id:24,cat:"lunch",     word:"breakfast",  display:"BREAKFAST",    emoji:"🥞", photo:"school breakfast tray",            color:"#E67E22", triggers:["breakfast","breakfast time"]},
  {id:25,cat:"lunch",     word:"drink",      display:"DRINK",        emoji:"🥛", photo:"child drinking milk glass",        color:"#F39C12", triggers:["drink","drink your milk"]},
  {id:26,cat:"lunch",     word:"tray",       display:"GET YOUR TRAY",emoji:"🍱", photo:"school lunch tray cafeteria",      color:"#D35400", triggers:["tray","get your tray"]},
  {id:27,cat:"lunch",     word:"sit and eat",display:"SIT AND EAT",  emoji:"🍽️",  photo:"children sitting eating cafeteria",color:"#CA6F1E", triggers:["sit and eat","eat your lunch"]},
  {id:28,cat:"emotions",  word:"happy",      display:"HAPPY",        emoji:"😊", photo:"happy smiling child school",       color:"#F1C40F", triggers:["happy","i'm happy"]},
  {id:29,cat:"emotions",  word:"sad",        display:"SAD",          emoji:"😢", photo:"sad child looking down",           color:"#5DADE2", triggers:["sad","i'm sad"]},
  {id:30,cat:"emotions",  word:"angry",      display:"ANGRY",        emoji:"😠", photo:"frustrated child",                 color:"#E74C3C", triggers:["angry","mad","i'm mad"]},
  {id:31,cat:"emotions",  word:"calm down",  display:"CALM DOWN",    emoji:"🌬️",  photo:"child calm breathing peaceful",    color:"#85C1E9", triggers:["calm down","breathe","calm"]},
  {id:32,cat:"emotions",  word:"scared",     display:"SCARED",       emoji:"😨", photo:"scared worried child",             color:"#7F8C8D", triggers:["scared","afraid"]},
  {id:33,cat:"emotions",  word:"excited",    display:"EXCITED",      emoji:"🤩", photo:"excited happy jumping child",      color:"#F39C12", triggers:["excited","i'm excited"]},
  {id:34,cat:"actions",   word:"stand up",   display:"STAND UP",     emoji:"🧍", photo:"child standing up classroom",      color:"#1ABC9C", triggers:["stand","stand up","get up"]},
  {id:35,cat:"actions",   word:"look",       display:"LOOK",         emoji:"👀", photo:"child looking pointing",           color:"#16A085", triggers:["look","look here","eyes on me"]},
  {id:36,cat:"actions",   word:"wait",       display:"WAIT",         emoji:"⏳", photo:"child waiting patiently",          color:"#5AAB2A", triggers:["wait","please wait","hold on"]},
  {id:37,cat:"actions",   word:"come here",  display:"COME HERE",    emoji:"👋", photo:"teacher waving child come",        color:"#5AAB2A", triggers:["come here","come to me"]},
  {id:38,cat:"actions",   word:"go",         display:"GO",           emoji:"🚦", photo:"green traffic light go",           color:"#5AAB2A", triggers:["let's go","go ahead","time to go","ready go"]},
  {id:39,cat:"actions",   word:"try again",  display:"TRY AGAIN",    emoji:"🔄", photo:"child trying again",               color:"#1ABC9C", triggers:["try again","let's try again"]},
];

const CATS = [
  {id:"core",       label:"Core",        icon:"⭐", color:"#1B65B8"},
  {id:"actions",    label:"Actions",     icon:"🏃", color:"#1ABC9C"},
  {id:"emotions",   label:"Emotions",    icon:"😊", color:"#F1C40F"},
  {id:"needs",      label:"Needs",       icon:"🙏", color:"#E67E22"},
  {id:"people",     label:"People",      icon:"👨‍👩‍👧", color:"#8E44AD"},
  {id:"food",       label:"Food",        icon:"🍎", color:"#E74C3C"},
  {id:"animals",    label:"Animals",     icon:"🐶", color:"#27AE60"},
  {id:"classroom",  label:"Classroom",   icon:"🏫", color:"#2980B9"},
  {id:"academic",   label:"Academic",    icon:"📚", color:"#8E44AD"},
  {id:"community",  label:"Community",   icon:"🏘️", color:"#16A085"},
  {id:"health",     label:"Health",      icon:"❤️",  color:"#E74C3C"},
  {id:"safety",     label:"Safety",      icon:"⚠️",  color:"#F39C12"},
  {id:"custom",     label:"My Words",    icon:"✏️",  color:"#95A5A6"},
];

const LEVELS = [
  {id:1,label:"Photo",    icon:"📷"},
  {id:2,label:"Color Art",icon:"🎨"},
  {id:3,label:"B&W Art",  icon:"✏️"},
  {id:4,label:"Word Only",icon:"🔤"},
];

const AVATARS = ["🐱","🐶","🐸","🦊","🐼","🐨","🦁","🐯","🦄","🐙","🦋","🐬","🦉","🐻","🐺"];

const DEMO_ACCOUNTS = [
  // ── Demo accounts — bypass all trials, always work ───────────
  {id:"demoT",   email:"teacher@saysee.io",      password:"SaySee2026!",  name:"Demo Teacher",       role:"teacher",        plan:"monthly", maxStudents:28},
  {id:"demoD",   email:"district@saysee.io",     password:"SaySee2026!",  name:"Demo District",      role:"district_admin", plan:"school",  maxStudents:999},
  {id:"demoT2",  email:"teacher2@saysee.io",     password:"SaySee2026!",  name:"Demo Teacher 2",     role:"teacher",        plan:"monthly", maxStudents:28},

  // ── Legacy demo ───────────────────────────────────────────────
  {id:"demo",    email:"teacher@demo.com",        password:"demo123",      name:"Ms. Johnson",        role:"teacher",        plan:"monthly", maxStudents:28},
];

// Demo accounts always bypass Supabase and trial checks
const DEMO_EMAILS = new Set(DEMO_ACCOUNTS.map(a=>a.email.toLowerCase()));

// ── Developmental Word Library (Age 0-8) ─────────────────────────
const DEV_AGES = [
  { id:"0-2", label:"0–2 Years", color:"#E74C3C", desc:"Foundational Core — I Need" },
  { id:"3-4", label:"3–4 Years", color:"#E67E22", desc:"Categorical Expansion — Tell Me About It" },
  { id:"5-6", label:"5–6 Years", color:"#27AE60", desc:"Academic Foundations — School Ready" },
  { id:"7-8", label:"7–8 Years", color:"#1B65B8", desc:"Self-Advocacy & Community — I Am" },
];

const DEV_WORDS = [
  // ── Age 0-2: Foundational Core ──────────────────────────────────
  // Core
  {id:"dw_yes",    word:"yes",       display:"YES",       emoji:"✅", cat:"core",       age:"0-2", triggers:["yes"]},
  {id:"dw_no",     word:"no",        display:"NO",        emoji:"❌", cat:"core",       age:"0-2", triggers:["no"]},
  {id:"dw_more",   word:"more",      display:"MORE",      emoji:"➕", cat:"core",       age:"0-2", triggers:["more"]},
  {id:"dw_help",   word:"help",      display:"HELP",      emoji:"🙋", cat:"core",       age:"0-2", triggers:["help","help me"]},
  {id:"dw_please", word:"please",    display:"PLEASE",    emoji:"🙏", cat:"core",       age:"0-2", triggers:["please"]},
  {id:"dw_mine",   word:"mine",      display:"MINE",      emoji:"👐", cat:"core",       age:"0-2", triggers:["mine"]},
  {id:"dw_up",     word:"up",        display:"UP",        emoji:"⬆️", cat:"core",       age:"0-2", triggers:["up"]},
  {id:"dw_down",   word:"down",      display:"DOWN",      emoji:"⬇️", cat:"core",       age:"0-2", triggers:["down"]},
  {id:"dw_on",     word:"on",        display:"ON",        emoji:"💡", cat:"core",       age:"0-2", triggers:["on","turn on"]},
  {id:"dw_off",    word:"off",       display:"OFF",       emoji:"🔴", cat:"core",       age:"0-2", triggers:["off","turn off"]},
  // Daily needs 0-2
  {id:"dw_eat",    word:"eat",       display:"EAT",       emoji:"🍽️", cat:"needs",      age:"0-2", triggers:["eat","eating","time to eat"]},
  {id:"dw_drink",  word:"drink",     display:"DRINK",     emoji:"🥤", cat:"needs",      age:"0-2", triggers:["drink","drinking"]},
  {id:"dw_sleep",  word:"sleep",     display:"SLEEP",     emoji:"😴", cat:"needs",      age:"0-2", triggers:["sleep","nap","bed time","nap time"]},
  {id:"dw_bath",   word:"bath",      display:"BATH",      emoji:"🛁", cat:"needs",      age:"0-2", triggers:["bath","bath time"]},
  {id:"dw_potty",  word:"potty",     display:"POTTY",     emoji:"🚽", cat:"needs",      age:"0-2", triggers:["potty","bathroom","restroom"]},
  {id:"dw_milk",   word:"milk",      display:"MILK",      emoji:"🥛", cat:"food",       age:"0-2", triggers:["milk"]},
  {id:"dw_water",  word:"water",     display:"WATER",     emoji:"💧", cat:"food",       age:"0-2", triggers:["water"]},
  {id:"dw_snack",  word:"snack",     display:"SNACK",     emoji:"🍎", cat:"food",       age:"0-2", triggers:["snack","snack time"]},
  {id:"dw_mom",    word:"mom",       display:"MOM",       emoji:"👩", cat:"people",     age:"0-2", triggers:["mom","mommy","mother"]},
  {id:"dw_dad",    word:"dad",       display:"DAD",       emoji:"👨", cat:"people",     age:"0-2", triggers:["dad","daddy","father"]},
  {id:"dw_baby",   word:"baby",      display:"BABY",      emoji:"👶", cat:"people",     age:"0-2", triggers:["baby"]},
  // ── Age 3-4: Categorical Expansion ──────────────────────────────
  // Emotions
  {id:"dw_happy",  word:"happy",     display:"HAPPY",     emoji:"😊", cat:"emotions",   age:"3-4", triggers:["happy","good"]},
  {id:"dw_sad",    word:"sad",       display:"SAD",       emoji:"😢", cat:"emotions",   age:"3-4", triggers:["sad"]},
  {id:"dw_angry",  word:"angry",     display:"ANGRY",     emoji:"😠", cat:"emotions",   age:"3-4", triggers:["angry","mad"]},
  {id:"dw_scared", word:"scared",    display:"SCARED",    emoji:"😨", cat:"emotions",   age:"3-4", triggers:["scared","afraid","fear"]},
  {id:"dw_tired",  word:"tired",     display:"TIRED",     emoji:"😫", cat:"emotions",   age:"3-4", triggers:["tired","sleepy"]},
  {id:"dw_excited",word:"excited",   display:"EXCITED",   emoji:"🤩", cat:"emotions",   age:"3-4", triggers:["excited"]},
  {id:"dw_silly",  word:"silly",     display:"SILLY",     emoji:"🤪", cat:"emotions",   age:"3-4", triggers:["silly"]},
  // Actions 3-4
  {id:"dw_run",    word:"run",       display:"RUN",       emoji:"🏃", cat:"actions",    age:"3-4", triggers:["run","running","let's run"]},
  {id:"dw_jump",   word:"jump",      display:"JUMP",      emoji:"⬆️", cat:"actions",    age:"3-4", triggers:["jump","jumping"]},
  {id:"dw_play",   word:"play",      display:"PLAY",      emoji:"🎮", cat:"actions",    age:"3-4", triggers:["play","playing","time to play","play time"]},
  {id:"dw_dance",  word:"dance",     display:"DANCE",     emoji:"💃", cat:"actions",    age:"3-4", triggers:["dance","dancing"]},
  {id:"dw_draw",   word:"draw",      display:"DRAW",      emoji:"✏️", cat:"actions",    age:"3-4", triggers:["draw","drawing","art time"]},
  {id:"dw_climb",  word:"climb",     display:"CLIMB",     emoji:"🧗", cat:"actions",    age:"3-4", triggers:["climb","climbing"]},
  // Animals 3-4
  {id:"dw_dog",    word:"dog",       display:"DOG",       emoji:"🐶", cat:"animals",    age:"3-4", triggers:["dog","puppy"]},
  {id:"dw_cat",    word:"cat",       display:"CAT",       emoji:"🐱", cat:"animals",    age:"3-4", triggers:["cat","kitty"]},
  {id:"dw_bird",   word:"bird",      display:"BIRD",      emoji:"🐦", cat:"animals",    age:"3-4", triggers:["bird"]},
  {id:"dw_fish",   word:"fish",      display:"FISH",      emoji:"🐟", cat:"animals",    age:"3-4", triggers:["fish"]},
  {id:"dw_rabbit", word:"rabbit",    display:"RABBIT",    emoji:"🐰", cat:"animals",    age:"3-4", triggers:["rabbit","bunny"]},
  {id:"dw_cow",    word:"cow",       display:"COW",       emoji:"🐄", cat:"animals",    age:"3-4", triggers:["cow"]},
  {id:"dw_lion",   word:"lion",      display:"LION",      emoji:"🦁", cat:"animals",    age:"3-4", triggers:["lion"]},
  {id:"dw_monkey", word:"monkey",    display:"MONKEY",    emoji:"🐒", cat:"animals",    age:"3-4", triggers:["monkey"]},
  // People 3-4
  {id:"dw_teacher",word:"teacher",   display:"TEACHER",   emoji:"👩‍🏫",cat:"people",     age:"3-4", triggers:["teacher"]},
  {id:"dw_friend", word:"friend",    display:"FRIEND",    emoji:"🤝", cat:"people",     age:"3-4", triggers:["friend"]},
  {id:"dw_grandma",word:"grandma",   display:"GRANDMA",   emoji:"👵", cat:"people",     age:"3-4", triggers:["grandma","grandmother"]},
  {id:"dw_grandpa",word:"grandpa",   display:"GRANDPA",   emoji:"👴", cat:"people",     age:"3-4", triggers:["grandpa","grandfather"]},
  {id:"dw_doctor", word:"doctor",    display:"DOCTOR",    emoji:"👨‍⚕️",cat:"people",     age:"3-4", triggers:["doctor"]},
  // Food 3-4
  {id:"dw_apple",  word:"apple",     display:"APPLE",     emoji:"🍎", cat:"food",       age:"3-4", triggers:["apple"]},
  {id:"dw_banana", word:"banana",    display:"BANANA",    emoji:"🍌", cat:"food",       age:"3-4", triggers:["banana"]},
  {id:"dw_cookie", word:"cookie",    display:"COOKIE",    emoji:"🍪", cat:"food",       age:"3-4", triggers:["cookie"]},
  {id:"dw_pizza",  word:"pizza",     display:"PIZZA",     emoji:"🍕", cat:"food",       age:"3-4", triggers:["pizza"]},
  {id:"dw_sandwich",word:"sandwich", display:"SANDWICH",  emoji:"🥪", cat:"food",       age:"3-4", triggers:["sandwich"]},
  // ── Age 5-6: Academic Foundations ───────────────────────────────
  // Classroom
  {id:"dw_pencil", word:"pencil",    display:"PENCIL",    emoji:"✏️", cat:"classroom",  age:"5-6", triggers:["pencil","get your pencil"]},
  {id:"dw_paper",  word:"paper",     display:"PAPER",     emoji:"📄", cat:"classroom",  age:"5-6", triggers:["paper","get paper"]},
  {id:"dw_book",   word:"book",      display:"BOOK",      emoji:"📚", cat:"classroom",  age:"5-6", triggers:["book","reading","get your book"]},
  {id:"dw_backpack",word:"backpack", display:"BACKPACK",  emoji:"🎒", cat:"classroom",  age:"5-6", triggers:["backpack","get your backpack","pack up"]},
  {id:"dw_scissors",word:"scissors", display:"SCISSORS",  emoji:"✂️", cat:"classroom",  age:"5-6", triggers:["scissors","cut"]},
  {id:"dw_glue",   word:"glue",      display:"GLUE",      emoji:"🫧", cat:"classroom",  age:"5-6", triggers:["glue"]},
  {id:"dw_marker", word:"marker",    display:"MARKER",    emoji:"🖊️", cat:"classroom",  age:"5-6", triggers:["marker"]},
  // Academic
  {id:"dw_count",  word:"count",     display:"COUNT",     emoji:"🔢", cat:"academic",   age:"5-6", triggers:["count","counting","let's count"]},
  {id:"dw_read",   word:"read",      display:"READ",      emoji:"📖", cat:"academic",   age:"5-6", triggers:["read","reading time","let's read"]},
  {id:"dw_write",  word:"write",     display:"WRITE",     emoji:"✍️", cat:"academic",   age:"5-6", triggers:["write","writing","let's write"]},
  {id:"dw_math",   word:"math",      display:"MATH",      emoji:"➕", cat:"academic",   age:"5-6", triggers:["math","math time"]},
  // Daily living 5-6
  {id:"dw_lunchbox",word:"lunchbox", display:"LUNCHBOX",  emoji:"🍱", cat:"needs",      age:"5-6", triggers:["lunchbox","lunch box"]},
  {id:"dw_bus",    word:"bus",       display:"BUS",       emoji:"🚌", cat:"community",  age:"5-6", triggers:["bus","school bus"]},
  {id:"dw_seatbelt",word:"seatbelt", display:"SEATBELT",  emoji:"🔒", cat:"safety",     age:"5-6", triggers:["seatbelt","seat belt","buckle up"]},
  {id:"dw_crosswalk",word:"crosswalk",display:"CROSSWALK",emoji:"🚶",cat:"safety",     age:"5-6", triggers:["crosswalk","cross the street"]},
  // ── Age 7-8: Self-Advocacy & Community ──────────────────────────
  // Health/Safety
  {id:"dw_sick",   word:"sick",      display:"SICK",      emoji:"🤒", cat:"health",     age:"7-8", triggers:["sick","not feeling well","I feel sick"]},
  {id:"dw_hurt",   word:"hurt",      display:"HURT",      emoji:"🤕", cat:"health",     age:"7-8", triggers:["hurt","I'm hurt","I got hurt"]},
  {id:"dw_pain",   word:"pain",      display:"PAIN",      emoji:"😣", cat:"health",     age:"7-8", triggers:["pain","it hurts"]},
  {id:"dw_dizzy",  word:"dizzy",     display:"DIZZY",     emoji:"😵", cat:"health",     age:"7-8", triggers:["dizzy"]},
  {id:"dw_emergency",word:"emergency",display:"EMERGENCY",emoji:"🆘",cat:"safety",     age:"7-8", triggers:["emergency","help me","call for help"]},
  // Advanced emotions
  {id:"dw_frustrated",word:"frustrated",display:"FRUSTRATED",emoji:"😤",cat:"emotions",age:"7-8", triggers:["frustrated","frustrating"]},
  {id:"dw_lonely", word:"lonely",    display:"LONELY",    emoji:"😔", cat:"emotions",   age:"7-8", triggers:["lonely","alone"]},
  {id:"dw_worried", word:"worried",  display:"WORRIED",   emoji:"😟", cat:"emotions",   age:"7-8", triggers:["worried","nervous","anxious"]},
  {id:"dw_calm",   word:"calm",      display:"CALM",      emoji:"😌", cat:"emotions",   age:"7-8", triggers:["calm","calm down","take a breath"]},
  {id:"dw_proud",  word:"proud",     display:"PROUD",     emoji:"🏆", cat:"emotions",   age:"7-8", triggers:["proud","good job"]},
  {id:"dw_brave",  word:"brave",     display:"BRAVE",     emoji:"🦁", cat:"emotions",   age:"7-8", triggers:["brave"]},
  // Community
  {id:"dw_police", word:"police",    display:"POLICE",    emoji:"👮", cat:"community",  age:"7-8", triggers:["police","police officer"]},
  {id:"dw_firefighter",word:"firefighter",display:"FIREFIGHTER",emoji:"🚒",cat:"community",age:"7-8",triggers:["firefighter","fire truck"]},
  {id:"dw_library", word:"library",  display:"LIBRARY",   emoji:"📚", cat:"community",  age:"7-8", triggers:["library"]},
  {id:"dw_restaurant",word:"restaurant",display:"RESTAURANT",emoji:"🍽️",cat:"community",age:"7-8",triggers:["restaurant","eating out"]},
  {id:"dw_store",  word:"store",     display:"STORE",     emoji:"🏪", cat:"community",  age:"7-8", triggers:["store","grocery store","market"]},
  // Universal signs
  {id:"dw_exit",   word:"exit",      display:"EXIT",      emoji:"🚪", cat:"safety",     age:"7-8", triggers:["exit"]},
  {id:"dw_entrance",word:"entrance", display:"ENTRANCE",  emoji:"🚶", cat:"safety",     age:"7-8", triggers:["entrance","enter"]},
  {id:"dw_danger", word:"danger",    display:"DANGER",    emoji:"⚠️", cat:"safety",     age:"7-8", triggers:["danger","dangerous"]},
];

// ── Reinforcer Survey Structure ───────────────────────────────────
const REINFORCER_SURVEY = [
  { id:"edibles", label:"Edibles", emoji:"🍎", subcats:[
    { id:"crunchy", label:"Crunchy", items:["Potato chips","Tortilla chips","Cheese crackers","Graham crackers","Popcorn","Pretzels"] },
    { id:"sweet",   label:"Sweet",   items:["Gummy bears","Fruit leather","Chocolate chips","Mini cookies","Lollipops","Dried fruit"] },
    { id:"fresh",   label:"Fresh",   items:["Apple slices","Grapes","Strawberries","Carrot sticks","Cucumber slices","String cheese"] },
    { id:"drinks",  label:"Drinks",  items:["Apple juice","Fruit punch","Sparkling water","Fruit smoothie","Chocolate milk"] },
  ]},
  { id:"toys", label:"Toys", emoji:"🧸", subcats:[
    { id:"building", label:"Building", items:["LEGO/DUPLO","Wooden blocks","Magnetic tiles","Lincoln Logs","Bristle blocks"] },
    { id:"figures",  label:"Figures",  items:["Superhero figures","Animal figures","Stuffed animals","Fashion dolls","Toy soldiers"] },
    { id:"vehicles", label:"Vehicles", items:["Hot Wheels cars","Remote control car","Construction trucks","Model trains","Fire engines"] },
    { id:"creative", label:"Creative", items:["Washable markers","Oil pastels","Sticker books","Modeling clay","Watercolor paints"] },
    { id:"puzzles",  label:"Puzzles",  items:["Jigsaw puzzles","Memory match","Dominoes","Marble run"] },
  ]},
  { id:"activities", label:"Activities", emoji:"🎯", subcats:[
    { id:"tech",       label:"Tech",        items:["Tablet games","Educational apps","Streaming cartoons","Interactive games"] },
    { id:"handson",    label:"Hands-on",    items:["Free-hand drawing","Craft kits","Building models","Cutting/pasting"] },
    { id:"imaginative",label:"Imaginative", items:["Dress-up costumes","Play kitchen","Puppet theater","Building forts","Doctor play"] },
    { id:"reading",    label:"Reading",     items:["Graphic novels","Audiobooks","Pop-up books","Magazines"] },
  ]},
  { id:"classroom", label:"Classroom", emoji:"🏫", subcats:[
    { id:"academic",   label:"Academic",   items:["Computer time","Silent reading","Using whiteboard","Writing with special pens"] },
    { id:"social",     label:"Social",     items:["Partner activities","Small group projects","Peer reading","Game time with peer"] },
    { id:"privileges", label:"Privileges", items:["Line leader","Picking music","Special chair","Teacher helper","Desk organizer"] },
  ]},
  { id:"indoor", label:"Indoor Activities", emoji:"🏠", subcats:[
    { id:"active_in",  label:"Active",  items:["Floor dancing","Yoga/stretching","Indoor obstacle course","Balloon volleyball","Simon Says"] },
    { id:"quiet_in",   label:"Quiet",   items:["Listening to music","Reading books","Puzzles","Coloring/mandala art"] },
    { id:"social_in",  label:"Social",  items:["Card games","Board games","Collaborative building"] },
  ]},
  { id:"sensory", label:"Sensory", emoji:"🌀", subcats:[
    { id:"tactile",    label:"Tactile",    items:["Play-doh","Modeling clay","Slime/Putty","Sensory bins","Kinetic sand","Stress balls"] },
    { id:"visual_s",   label:"Visual",     items:["Lava lamps","Fiber optic lights","Spin toys","Glitter bottles","Kaleidoscope"] },
    { id:"auditory",   label:"Auditory",   items:["Noise-canceling headphones","White noise","Rainsticks","Calming sounds"] },
    { id:"proprioceptive",label:"Body/Movement",items:["Weighted blankets","Indoor swing","Rocking chair","Mini trampoline","Compression vest"] },
  ]},
  { id:"outdoor", label:"Outdoor", emoji:"🌳", subcats:[
    { id:"active_out", label:"Active",  items:["Tricycle/Bicycle","Scooter","Climbing structures","Slide/Swing","Jump rope","Tag/Chase"] },
    { id:"nature",     label:"Nature",  items:["Nature scavenger hunt","Collecting rocks","Gardening","Bird watching"] },
    { id:"water",      label:"Water",   items:["Water table","Sandbox","Sprinklers","Water balloons","Painting with water"] },
  ]},
];


// ── IP Notice ────────────────────────────────────────────────────
// © 2026 SaySee LLC. All rights reserved. SaySee™ is a registered trademark.
// Patent Pending — U.S. Application No. 64/086,776

const DEMO_STUDENTS = [
  {id:"s1", name:"Alex R.",   avatar:"🐱", color:"#1B65B8", level:1, progress:{},                  sharedWith:[]},
  {id:"s2", name:"Maya T.",   avatar:"🦊", color:"#8E44AD", level:2, progress:{1:true,2:true,5:true},sharedWith:[]},
  {id:"s3", name:"Jordan K.", avatar:"🐸", color:"#5AAB2A", level:1, progress:{},                  sharedWith:[]},
];

// Photos are stored as base64 data URLs in mem store, keyed by word id
// No external image service needed — all royalty-free because teachers take them
function getWordPhoto(wordId, userId){ return mem.get(`photo_${wordId}_${userId}`, mem.get(`photo_${wordId}`, null)); }
function setWordPhoto(wordId, dataUrl){ mem.set(`photo_${wordId}`, dataUrl); }

function readFileAsDataURL(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result);
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}

// ── Tiny shared UI ────────────────────────────────────────────
function Btn({children,onClick,color="#1B65B8",outline,danger,full,disabled,small,style={}}){
  const bg=outline?"transparent":danger?"#E74C3C":color;
  const fc=outline?(danger?"#E74C3C":color):"#fff";
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:bg,color:fc,border:outline?`2px solid ${danger?"#E74C3C":color}`:"none",
      borderRadius:12,padding:small?"7px 14px":"12px 22px",
      fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:small?13:15,
      cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,
      width:full?"100%":undefined,
      boxShadow:outline||disabled?"none":`0 4px 16px ${bg}55`,
      transition:"all 0.2s",...style
    }}>{children}</button>
  );
}

function Field({label,value,onChange,type="text",placeholder=""}){
  return(
    <div style={{marginBottom:15}}>
      {label&&<div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>{label}</div>}
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{width:"100%",padding:"11px 14px",border:"2px solid #E8ECF0",borderRadius:12,fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",background:"#FAFBFC"}}/>
    </div>
  );
}

function Modal({children,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,10,30,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"min(94vw,420px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",animation:"popIn 0.3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function MH({children}){
  return <div style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#1A1A2E",marginBottom:20}}>{children}</div>;
}

// ── Photo upload button (shown on word chips when no photo exists) ──
function PhotoUploadPrompt({entry, onPhotoSaved}){
  const inputRef=useRef(null);
  const [saving,setSaving]=useState(false);

  const handleFile=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setSaving(true);
    try{
      const dataUrl=await readFileAsDataURL(file);
      setWordPhoto(entry.id, dataUrl);
      onPhotoSaved(entry.id, dataUrl);
    }catch(err){console.error(err);}
    setSaving(false);
    e.target.value="";
  };

  return(
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{display:"none"}}/>
      <button onClick={()=>inputRef.current?.click()} style={{
        display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
        borderRadius:30,border:`2px dashed ${entry.color}`,
        background:`${entry.color}10`,color:entry.color,
        fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,
        cursor:"pointer",transition:"all 0.2s"
      }}>
        {saving?"⏳ Saving…":"📸 Add Photo"}
      </button>
    </>
  );
}

// ── Word card ─────────────────────────────────────────────────
function WordCard({entry, level, photoOverride, onRequestPhoto}){
  const [ok,setOk]=useState(false);
  const storedPhoto = photoOverride || getWordPhoto(entry.id);
  useEffect(()=>{setOk(false);},[entry.id, level, storedPhoto]);

  if(level===4) return(
    <div style={{animation:"popIn 0.5s cubic-bezier(.34,1.56,.64,1)",textAlign:"center",padding:"0 20px",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vw"}}>
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(72px,18vw,160px)",color:entry.color,lineHeight:1.05,textShadow:`0 6px 32px ${entry.color}55`,letterSpacing:2}}>{entry.display}</div>
    </div>
  );

  const isFullScreen = true;
  const boxSize = isFullScreen ? "min(92vw, 92vh)" : "min(70vw,400px)";
  const box={width:boxSize,height:boxSize,borderRadius:0,overflow:"hidden",position:"relative",animation:"popIn 0.5s cubic-bezier(.34,1.56,.64,1)"};

  if(level===1){
    // No photo yet — show prompt
    if(!storedPhoto) return(
      <div style={{...box,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:`${entry.color}10`,border:`3px dashed ${entry.color}66`,gap:16}}>
        <div style={{fontSize:"min(38vw,38vh)",lineHeight:1}}>{entry.emoji}</div>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:entry.color,textAlign:"center",padding:"0 20px"}}>
          📷 Add a Photo
        </div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",textAlign:"center",padding:"0 24px",lineHeight:1.5}}>
          Tap the camera below to add a real photo for "{entry.display}" — a photo from your actual classroom works best
        </div>
        {onRequestPhoto&&(
          <button onClick={onRequestPhoto} style={{
            padding:"10px 22px",borderRadius:30,border:"none",
            background:entry.color,color:"#fff",
            fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14,
            cursor:"pointer",boxShadow:`0 4px 16px ${entry.color}55`
          }}>📸 Take / Upload Photo</button>
        )}
      </div>
    );

    // Has photo
    return(
      <div style={box}>
        {!ok&&<div style={{position:"absolute",inset:0,background:"#F0F3F7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>✨</div>}
        <img src={storedPhoto} alt={entry.word}
          onLoad={()=>setOk(true)}
          style={{width:"100%",height:"100%",objectFit:"cover",opacity:ok?1:0,transition:"opacity 0.4s"}}/>
      </div>
    );
  }

  // Levels 2 & 3 — emoji art (no photo needed)
  return(
    <div style={{...box,display:"flex",alignItems:"center",justifyContent:"center",background:level===2?`${entry.color}14`:"#F4F5F7"}}>
      <div style={{fontSize:"min(65vw,65vh)",lineHeight:1,filter:level===3?"grayscale(100%) contrast(0.55)":"none",transition:"filter 0.4s"}}>{entry.emoji}</div>
    </div>
  );
}

// ── Student display mode (full screen) ───────────────────────
function StudentMode({entry,level,listening,transcript,onExit}){
  const [taps,setTaps]=useState(0);
  const timer=useRef(null);
  const handleTap=()=>{
    setTaps(n=>n+1);
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>setTaps(0),800);
  };
  useEffect(()=>{if(taps>=3){setTaps(0);onExit();}},[taps]);

  return(
    <div onClick={handleTap} style={{position:"fixed",inset:0,background:entry?"#FFFFFF":"#1B4F9E",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:100,userSelect:"none",overflow:"hidden"}}>

      {/* Tiny mic dot top right */}
      <div style={{position:"absolute",top:14,right:16,zIndex:2}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:listening?"#5AAB2A":"rgba(255,255,255,0.3)",animation:listening?"mPulse 1.8s ease-in-out infinite":"none"}}/>
      </div>

      {entry?(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <WordCard entry={entry} level={level} photoOverride={getWordPhoto(entry?.id)}/>
          {level>=2&&level<=4&&(
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(32px,9vw,64px)",color:entry.color,letterSpacing:2,textShadow:`0 3px 14px ${entry.color}44`,animation:"fadeUp 0.5s ease",textAlign:"center",padding:"8px 20px 0",width:"100%",background:"#fff"}}>
              {entry.display}
            </div>
          )}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:28}}>
          {listening?(
            <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{position:"absolute",width:240,height:240,borderRadius:"50%",background:"rgba(255,255,255,0.05)",animation:"listenPulse 2s ease-in-out infinite"}}/>
              <div style={{position:"absolute",width:185,height:185,borderRadius:"50%",background:"rgba(255,255,255,0.08)",animation:"listenPulse 2s ease-in-out infinite 0.4s"}}/>
              <div style={{position:"absolute",width:135,height:135,borderRadius:"50%",background:"rgba(255,255,255,0.12)",animation:"listenPulse 2s ease-in-out infinite 0.8s"}}/>
              <div style={{width:88,height:88,borderRadius:"50%",background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
                <SaySeeIcon size={52} bg="blue"/>
              </div>
            </div>
          ):(
            <SaySeeIcon size={80} bg="blue"/>
          )}
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"rgba(255,255,255,0.7)",letterSpacing:1}}>
            {listening?"Listening…":"Tap to start"}
          </div>
        </div>
      )}

      <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",fontSize:10,color:"rgba(255,255,255,0.2)",fontFamily:"'Nunito',sans-serif"}}>triple-tap to exit</div>
    </div>
  );
}

// ── Working For Board ────────────────────────────────────────────
function WorkingForBoard({item, onPickNew, onBackToAAC, studentName}){
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#FFF8E1",gap:20,padding:20}}>
      <div style={{background:"#F5A623",borderRadius:16,padding:"10px 32px",boxShadow:"0 4px 20px #F5A62355"}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:28,color:"#fff",letterSpacing:2,textAlign:"center"}}>
          {studentName ? `${studentName} is Working For` : "Working For"}
        </div>
      </div>
      {item ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,animation:"popIn 0.5s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{fontSize:"min(45vw,45vh)",lineHeight:1}}>{item.emoji}</div>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(28px,8vw,52px)",color:"#F5A623",letterSpacing:2}}>{item.label.toUpperCase()}</div>
        </div>
      ):(
        <div style={{textAlign:"center",opacity:0.5}}>
          <div style={{fontSize:64,marginBottom:8}}>🌟</div>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#F5A623"}}>Say the reward name</div>
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <button onClick={onPickNew} style={{padding:"10px 24px",borderRadius:30,border:"2px solid #F5A623",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#F5A623",cursor:"pointer"}}>🔄 Change Reward</button>
        <button onClick={onBackToAAC} style={{padding:"10px 24px",borderRadius:30,border:"2px solid #5AAB2A",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#5AAB2A",cursor:"pointer"}}>↩ Back to AAC</button>
      </div>
    </div>
  );
}

// ── First Then Board ──────────────────────────────────────────────
function FirstThenBoard({firstItem, thenItem, onExit}){
  return(
    <div style={{position:"fixed", inset:0, zIndex:200,
      display:"flex", flexDirection:"column", overflow:"hidden", background:"#E3F2FD"}}>
      {/* Exit button */}
      {onExit&&(
        <button onClick={onExit}
          style={{position:"absolute", top:10, right:10, zIndex:10,
          background:"rgba(0,0,0,0.25)", border:"none", borderRadius:10,
          padding:"7px 12px", color:"#fff", fontFamily:"'Nunito',sans-serif",
          fontWeight:900, fontSize:15, cursor:"pointer", lineHeight:1}}>
          ✕
        </button>
      )}

      {/* FIRST — top half */}
      <div style={{flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"#E3F2FD", borderBottom:"4px solid #1B65B8", padding:16, gap:10, minHeight:0}}>
        <div style={{background:"#1B65B8", borderRadius:14, padding:"6px 28px"}}>
          <div style={{fontFamily:"'Fredoka One',cursive", fontSize:"clamp(20px,6vw,30px)",
            color:"#fff", letterSpacing:2}}>FIRST</div>
        </div>
        {firstItem ? (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center",
            gap:8, animation:"popIn 0.4s ease", minHeight:0}}>
            {firstItem.imgUrl
              ? <img src={firstItem.imgUrl} alt={firstItem.word}
                  style={{width:"min(40vw,30vh)", height:"min(40vw,30vh)",
                    objectFit:"cover", borderRadius:20}}
                  onError={e=>{e.target.style.display='none';}}/>
              : <div style={{fontSize:"min(28vw,26vh)", lineHeight:1}}>{firstItem.emoji}</div>}
            <div style={{fontFamily:"'Fredoka One',cursive", fontSize:"clamp(22px,7vw,40px)",
              color:"#1B65B8", textAlign:"center"}}>{firstItem.display||firstItem.label}</div>
          </div>
        ):(
          <div style={{opacity:0.35, textAlign:"center"}}>
            <div style={{fontSize:"min(16vw,12vh)"}}>❓</div>
            <div style={{fontFamily:"'Nunito',sans-serif", fontSize:14, color:"#1B65B8",
              fontWeight:700}}>Say the task after "first" or "if"</div>
          </div>
        )}
      </div>

      {/* THEN — bottom half */}
      <div style={{flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"#E8F5E9", padding:16, gap:10, minHeight:0}}>
        <div style={{background:"#5AAB2A", borderRadius:14, padding:"6px 28px"}}>
          <div style={{fontFamily:"'Fredoka One',cursive", fontSize:"clamp(20px,6vw,30px)",
            color:"#fff", letterSpacing:2}}>THEN</div>
        </div>
        {thenItem ? (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center",
            gap:8, animation:"popIn 0.4s ease", minHeight:0}}>
            {thenItem.imgUrl
              ? <img src={thenItem.imgUrl} alt={thenItem.word}
                  style={{width:"min(40vw,30vh)", height:"min(40vw,30vh)",
                    objectFit:"cover", borderRadius:20}}
                  onError={e=>{e.target.style.display='none';}}/>
              : <div style={{fontSize:"min(28vw,26vh)", lineHeight:1}}>{thenItem.emoji}</div>}
            <div style={{fontFamily:"'Fredoka One',cursive", fontSize:"clamp(22px,7vw,40px)",
              color:"#5AAB2A", textAlign:"center"}}>{thenItem.display||thenItem.label}</div>
          </div>
        ):(
          <div style={{opacity:0.35, textAlign:"center"}}>
            <div style={{fontSize:"min(16vw,12vh)"}}>🌟</div>
            <div style={{fontFamily:"'Nunito',sans-serif", fontSize:14, color:"#5AAB2A",
              fontWeight:700}}>Say "then" + the reward</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Choice Board ──────────────────────────────────────────────────
function ChoiceBoard({items, selected, onSelect, stage, onDone, onExit}){
  const isWorkingFor = stage === "workingfor_pick";
  const headerColor  = isWorkingFor ? "#F5A623" : "#8E44AD";
  const headerText   = isWorkingFor ? "🌟 Working for?"
                     : stage === "listening" ? "🎯 Add choices…"
                     : "Choice Board";

  // Always lay out as a fixed 6-slot grid (2 columns × 3 rows) so a small
  // number of choices are not stretched/elongated. Items fill from the top.
  const SLOTS = 6;
  const slots = Array.from({length:SLOTS}, (_,i)=>items[i]||null);

  return(
    <div style={{position:"fixed", inset:0,
      background: isWorkingFor ? "#FFF8E7" : "#F3E5F5",
      display:"flex", flexDirection:"column", zIndex:200, overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:headerColor, padding:"10px 14px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:8, flexShrink:0}}>
        <div style={{fontFamily:"'Fredoka One',cursive", fontSize:18, color:"#fff",
          letterSpacing:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
          {headerText}
        </div>
        <div style={{display:"flex", gap:8, flexShrink:0}}>
          {stage==="listening"&&items.length>=1&&(
            <button onClick={onDone}
              style={{background:"rgba(255,255,255,0.9)",border:"none",borderRadius:10,
              padding:"7px 16px",color:headerColor,fontFamily:"'Nunito',sans-serif",
              fontWeight:900,fontSize:13,cursor:"pointer"}}>
              ✓ Done
            </button>
          )}
          <button onClick={onExit}
            style={{background:"rgba(255,255,255,0.25)",border:"none",borderRadius:10,
            padding:"7px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
            fontWeight:900,fontSize:15,cursor:"pointer",lineHeight:1}}>
            ✕
          </button>
        </div>
      </div>

      {/* Listening status — keeps prompting until all 6 slots are used */}
      {stage==="listening"&&items.length<SLOTS&&(
        <div style={{background:"rgba(142,68,173,0.10)",padding:"8px 14px",
          textAlign:"center",flexShrink:0}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#8E44AD",fontWeight:800}}>
            {items.length===0
              ? "Say the first choice… (up to 6)"
              : `${items.length} added — say another, or tap ✓ Done`}
          </div>
        </div>
      )}

      {/* Fixed 2 × 3 choice grid */}
      <div style={{flex:1, display:"grid",
        gridTemplateColumns:"repeat(2, 1fr)", gridTemplateRows:"repeat(3, 1fr)",
        gap:8, padding:8, minHeight:0}}>
        {slots.map((item,i)=>{
          if(!item){
            return(
              <div key={`empty-${i}`} style={{borderRadius:18,
                border: stage==="listening" ? "2px dashed rgba(142,68,173,0.25)" : "none",
                background: stage==="listening" ? "rgba(255,255,255,0.35)" : "transparent"}}/>
            );
          }
          const isSelected = selected?.id===item.id;
          return(
            <button key={item.id||i} onClick={()=>onSelect(item)}
              style={{display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:4, padding:6, borderRadius:18, border:"none",
                cursor:"pointer", minHeight:0, width:"100%", height:"100%",
                background: isSelected ? headerColor : "#fff",
                boxShadow: isSelected ? `0 6px 24px ${headerColor}66` : "0 3px 12px rgba(0,0,0,0.1)",
                transform: isSelected ? "scale(0.97)" : "scale(1)",
                transition:"all 0.2s", overflow:"hidden"}}>
              <div style={{flex:1, width:"100%", minHeight:0, display:"flex",
                alignItems:"center", justifyContent:"center", overflow:"hidden", borderRadius:12}}>
                {item.imgUrl?(
                  <img src={item.imgUrl} alt={item.word}
                    style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12}}
                    onError={e=>{e.target.style.display='none';}}/>
                ):(
                  <div style={{fontSize:"clamp(32px,9vw,64px)",lineHeight:1}}>{item.emoji||"🎯"}</div>
                )}
              </div>
              <div style={{fontFamily:"'Fredoka One',cursive", fontSize:"clamp(13px,4vw,20px)",
                color: isSelected ? "#fff" : "#333", textAlign:"center", lineHeight:1.1,
                flexShrink:0, paddingBottom:2}}>
                {(item.display||item.label||item.word||"").toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected confirmation bar */}
      {selected&&(
        <div style={{background:headerColor, padding:"10px 20px", textAlign:"center",
          flexShrink:0, animation:"popIn 0.3s ease"}}>
          <div style={{fontFamily:"'Fredoka One',cursive", fontSize:18, color:"#fff"}}>
            {isWorkingFor?"🌟":"✅"}{" "}
            {(selected.display||selected.label||selected.word||"").toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Reinforcer Picker Modal ───────────────────────────────────────
function ReinforcerPicker({onSelect, onClose}){
  const [activeCat,setActiveCat]=useState("edible");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:3000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:500,maxHeight:"70vh",overflowY:"auto"}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#F5A623",marginBottom:12,textAlign:"center"}}>🌟 Pick a Reward</div>
        <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"center"}}>
          {["edible","activity","tangible"].map(c=>(
            <button key={c} onClick={()=>setActiveCat(c)} style={{padding:"6px 16px",borderRadius:30,border:"none",background:activeCat===c?"#F5A623":"#F4F5F7",color:activeCat===c?"#fff":"#666",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",textTransform:"capitalize"}}>{c}s</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {REINFORCERS.filter(r=>r.category===activeCat).map(r=>(
            <button key={r.id} onClick={()=>onSelect(r)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:12,borderRadius:14,border:"2px solid #F4F5F7",background:"#fff",cursor:"pointer"}}>
              <div style={{fontSize:32}}>{r.emoji}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,color:"#333"}}>{r.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stripe Payment Form ──────────────────────────────────────
function PaymentForm({user, plan, onSuccess, onCancel}){
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const cardElementRef = useRef(null);

  const STRIPE_KEY = import.meta.env.VITE_STRIPE_KEY;
  const MONTHLY_PRICE = import.meta.env.VITE_STRIPE_MONTHLY_PRICE;
  const ANNUAL_PRICE = import.meta.env.VITE_STRIPE_ANNUAL_PRICE;

  const planDetails = plan === 'monthly'
    ? { label: 'Monthly', price: '$28/month', priceId: MONTHLY_PRICE }
    : { label: 'Annual',  price: '$252/year', priceId: ANNUAL_PRICE };

  useEffect(()=>{
    // Load Stripe.js dynamically
    if(!STRIPE_KEY) return;
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      stripeRef.current = window.Stripe(STRIPE_KEY);
      elementsRef.current = stripeRef.current.elements();
      cardElementRef.current = elementsRef.current.create('card', {
        style: {
          base: {
            fontSize: '16px',
            fontFamily: "'Nunito', sans-serif",
            color: '#1A1A2E',
            '::placeholder': { color: '#AAB' },
          },
          invalid: { color: '#E74C3C' },
        }
      });
      cardElementRef.current.mount(cardRef.current);
      cardElementRef.current.on('ready', () => setCardReady(true));
      cardElementRef.current.on('change', e => {
        if(e.error) setError(e.error.message);
        else setError('');
      });
    };
    document.head.appendChild(script);
    return () => {
      if(cardElementRef.current) cardElementRef.current.destroy();
    };
  }, []);

  const handleSubmit = async () => {
    if(!stripeRef.current || !cardElementRef.current) return;
    setLoading(true);
    setError('');
    try {
      // Create payment method
      const { paymentMethod, error: pmError } = await stripeRef.current
        .createPaymentMethod({ type: 'card', card: cardElementRef.current,
          billing_details: { email: user.email, name: user.name }
        });
      if(pmError){ setError(pmError.message); setLoading(false); return; }

      // Call Vercel API to create subscription
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          priceId: planDetails.priceId,
          email: user.email,
          userId: user.id,
          plan: plan,
        })
      });
      const data = await res.json();
      console.log('Subscription response:', data);
      if(data.error){ setError(data.error); setLoading(false); return; }
      if(data.requiresAction){
        const { error: confirmError } = await stripeRef.current
          .confirmCardPayment(data.clientSecret);
        if(confirmError){ setError(confirmError.message); setLoading(false); return; }
      }
      onSuccess(plan);
    } catch(e){
      setError('Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return(
    <div style={{background:"#fff",borderRadius:20,padding:28,width:"min(94vw,420px)",boxShadow:"0 24px 60px rgba(0,0,0,0.15)"}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <SaySeeFullLogo size={80}/>
      </div>
      <div style={{background:"#EEF5FF",borderRadius:14,padding:"14px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#1B65B8"}}>{planDetails.label} Plan</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>Up to 28 students · Cancel anytime</div>
        </div>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1B65B8"}}>{planDetails.price}</div>
      </div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Card Details</div>
      <div ref={cardRef} style={{padding:"14px 16px",border:"2px solid #E8ECF0",borderRadius:12,marginBottom:16,minHeight:44,background:"#fff"}}/>
      {error&&<div style={{background:"#FFF5F5",border:"1px solid #FED7D7",borderRadius:10,padding:"8px 12px",marginBottom:12,fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#E74C3C"}}>{error}</div>}
      <button onClick={handleSubmit} disabled={loading||!cardReady}
        style={{width:"100%",padding:"14px",borderRadius:30,border:"none",
          background:loading||!cardReady?"#CCC":"#5AAB2A",
          color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,
          cursor:loading||!cardReady?"not-allowed":"pointer",
          boxShadow:loading||!cardReady?"none":"0 4px 16px #5AAB2A55",
          marginBottom:10}}>
        {loading?"Processing...":"Subscribe Now"}
      </button>
      <button onClick={onCancel} style={{width:"100%",padding:"10px",borderRadius:30,border:"2px solid #EEE",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,color:"#AAA",cursor:"pointer"}}>
        Cancel
      </button>
      <div style={{textAlign:"center",marginTop:12,fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#CCC"}}>
        🔒 Secured by Stripe · © 2026 SaySee LLC
      </div>
    </div>
  );
}

// ── Trial Expired Screen ─────────────────────────────────────────
function TrialExpiredScreen({user, onLogout, setShowPayment, setPaymentPlan}){
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1B4F9E,#2B6CB0)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:24,padding:36,maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,0.2)"}}>
        <SaySeeFullLogo size={100}/>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1B65B8",margin:"20px 0 8px"}}>Your Free Trial Has Ended</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"#666",lineHeight:1.7,marginBottom:24}}>
          Thank you for trying SaySee™! Choose a plan to continue supporting your students.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {[
            {label:"Monthly",price:"$28/mo",sub:"Up to 28 students · Cancel anytime",color:"#1B65B8",plan:"monthly"},
            {label:"Annual",price:"$252/yr",sub:"Save 25% · Best value",color:"#5AAB2A",badge:"BEST VALUE",plan:"annual"},
          ].map(p=>(
            <div key={p.label} onClick={()=>{setPaymentPlan(p.plan);setShowPayment(true);}}
              style={{padding:"14px 16px",borderRadius:14,background:`${p.color}12`,border:`2px solid ${p.color}`,position:"relative",cursor:"pointer"}}>
              {p.badge&&<div style={{position:"absolute",top:-9,right:12,background:p.color,color:"#fff",fontSize:9,fontWeight:900,padding:"2px 8px",borderRadius:20,fontFamily:"'Nunito',sans-serif"}}>{p.badge}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#1A1A2E"}}>{p.label}</div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:p.color}}>{p.price}</div>
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:2}}>{p.sub}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:p.color,marginTop:4,fontWeight:800}}>Tap to subscribe →</div>
            </div>
          ))}
        </div>
        <a href="mailto:hello@saysee.io" style={{display:"block",padding:"10px",borderRadius:30,border:"2px solid #EEE",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,color:"#AAA",textDecoration:"none",marginBottom:8,textAlign:"center"}}>✉️ hello@saysee.io</a>
        <button onClick={onLogout} style={{background:"none",border:"none",fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#AAA",cursor:"pointer"}}>Sign out</button>
      </div>
    </div>
  );
}

// ── Home Screen ──────────────────────────────────────────────────
function HomeScreen({user, onMode, onLogout}){
  const tiles = [
    {id:"say",   label:"Say",      emoji:"👄", color:"#1B65B8", desc:"Start listening now"},
    {id:"see",   label:"See",      emoji:"👁️",  color:"#5AAB2A", desc:"Words & categories"},
    {id:"teach", label:"Teach",    emoji:"🎓", color:"#8E44AD", desc:"Students & data"},
    {id:"data",  label:"Data",     emoji:"📊", color:"#E67E22", desc:"Progress & graphs"},
    {id:"settings",label:"Settings",emoji:"⚙️", color:"#607D8B", desc:"Account & preferences"},
  ];
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1B4F9E 0%,#1B65B8 60%,#2B6CB0 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px 24px"}}>
      {/* Logo */}
      <div style={{marginBottom:32,textAlign:"center"}}>
        <SaySeeFullLogo size={80}/>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"rgba(255,255,255,0.5)",
          marginTop:6,letterSpacing:1}}>
          Welcome back, {user.name?.split(" ")[0]||"Teacher"}
        </div>
      </div>

      {/* Main tiles grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,width:"100%",maxWidth:420,marginBottom:14}}>
        {tiles.slice(0,2).map(t=>(
          <button key={t.id} onClick={()=>onMode(t.id)}
            style={{padding:"28px 16px",borderRadius:20,border:"none",
            background:`linear-gradient(135deg,${t.color},${t.color}CC)`,
            color:"#fff",cursor:"pointer",
            boxShadow:`0 8px 24px ${t.color}55`,
            transition:"all 0.2s",display:"flex",flexDirection:"column",
            alignItems:"center",gap:10}}>
            <div style={{fontSize:44}}>{t.emoji}</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,letterSpacing:1}}>{t.label}</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,
              color:"rgba(255,255,255,0.7)",textAlign:"center"}}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,width:"100%",maxWidth:420}}>
        {tiles.slice(2).map(t=>(
          <button key={t.id} onClick={()=>onMode(t.id)}
            style={{padding:"20px 10px",borderRadius:18,border:"none",
            background:`linear-gradient(135deg,${t.color},${t.color}CC)`,
            color:"#fff",cursor:"pointer",
            boxShadow:`0 6px 18px ${t.color}44`,
            transition:"all 0.2s",display:"flex",flexDirection:"column",
            alignItems:"center",gap:8}}>
            <div style={{fontSize:30}}>{t.emoji}</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:16}}>{t.label}</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,
              color:"rgba(255,255,255,0.6)",textAlign:"center",lineHeight:1.3}}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Trial warning if applicable */}
      {user.plan==="trial"&&(
        <div style={{marginTop:20,padding:"10px 16px",borderRadius:12,
          background:"rgba(245,166,35,0.15)",border:"1px solid rgba(245,166,35,0.3)",
          fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#F5A623",
          textAlign:"center",maxWidth:420,width:"100%"}}>
          ⏰ Free trial active — subscribe to keep access
        </div>
      )}
    </div>
  );
}

// ── See Screen (Word Library) ─────────────────────────────────────
function SeeScreen({user, words, onBack}){
  const [activeAge, setActiveAge]     = useState("all");
  const [activeCat, setActiveCat]     = useState("all");
  const [search, setSearch]           = useState("");
  const [showSearch, setShowSearch]   = useState(false);
  const [expandedWord, setExpandedWord] = useState(null);
  const [showAddWordInSee, setShowAddWordInSee] = useState(false);

  // Combine master words + dev words
  const allWords = words;

  // Filter
  const filtered = allWords.filter(w=>{
    const matchAge = activeAge==="all" || w.age===activeAge;
    const matchCat = activeCat==="all" || w.cat===activeCat;
    const matchSearch = !search || 
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.display?.toLowerCase().includes(search.toLowerCase());
    return matchAge && matchCat && matchSearch;
  });

  // Use CATS definition for consistent ordering and icons across all views
  const cats = ["all", ...CATS.map(c=>c.id)];

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:"#5AAB2A",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12,boxShadow:"0 2px 12px rgba(90,171,42,0.3)"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#fff",flex:1}}>
          👁️ See — Word Library
        </div>
        <button onClick={()=>setShowSearch(p=>!p)} style={{background:"rgba(255,255,255,0.2)",
          border:"none",borderRadius:10,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:16}}>
          🔍
        </button>
      </div>

      {/* Search bar */}
      {showSearch&&(
        <div style={{padding:"10px 16px",background:"#fff",borderBottom:"1px solid #EEF0F4"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search any word..."
            autoFocus
            style={{width:"100%",padding:"10px 14px",borderRadius:10,
            border:"2px solid #5AAB2A",fontFamily:"'Nunito',sans-serif",
            fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
      )}

      {/* Age band filter */}
      <div style={{background:"#fff",padding:"8px 12px",display:"flex",
        gap:6,overflowX:"auto",scrollbarWidth:"none",borderBottom:"1px solid #EEF0F4"}}>
        <button onClick={()=>setActiveAge("all")}
          style={{flexShrink:0,padding:"5px 14px",borderRadius:20,border:"none",
          background:activeAge==="all"?"#5AAB2A":"#F0F2F5",
          color:activeAge==="all"?"#fff":"#666",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:11,cursor:"pointer"}}>All Ages</button>
        {DEV_AGES.map(a=>(
          <button key={a.id} onClick={()=>setActiveAge(a.id)}
            style={{flexShrink:0,padding:"5px 14px",borderRadius:20,border:"none",
            background:activeAge===a.id?a.color:"#F0F2F5",
            color:activeAge===a.id?"#fff":"#666",fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:11,cursor:"pointer"}}>{a.label}</button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{background:"#fff",padding:"8px 12px",display:"flex",
        gap:6,overflowX:"auto",scrollbarWidth:"none",borderBottom:"2px solid #EEF0F4"}}>
        {cats.map(c=>{
          const catDef = CATS.find(x=>x.id===c);
          const label = c==="all" ? "⭐ All" : `${catDef?.icon||""} ${catDef?.label||c}`;
          const activeColor = catDef?.color || "#1B65B8";
          return(
            <button key={c} onClick={()=>setActiveCat(c)}
              style={{flexShrink:0,padding:"5px 14px",borderRadius:20,border:"none",
              background:activeCat===c?activeColor:"#F0F2F5",
              color:activeCat===c?"#fff":"#666",fontFamily:"'Nunito',sans-serif",
              fontWeight:800,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Word grid */}
      <div style={{flex:1,padding:12,overflowY:"auto"}}>
        <div style={{fontSize:11,color:"#AAA",fontFamily:"'Nunito',sans-serif",
          marginBottom:8,fontWeight:700}}>{filtered.length} words</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8}}>
          {filtered.map(w=>(
            <button key={w.id} onClick={()=>setExpandedWord(expandedWord?.id===w.id?null:w)}
              style={{padding:"12px 8px",borderRadius:14,border:"none",
              background:expandedWord?.id===w.id?"#1B65B8":"#fff",
              cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              transition:"all 0.2s"}}>
              <div style={{fontSize:28}}>{w.emoji}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:12,
                color:expandedWord?.id===w.id?"#fff":"#333",textAlign:"center",lineHeight:1.2}}>
                {w.display||w.word}
              </div>
              {w.age&&(
                <div style={{fontSize:9,color:expandedWord?.id===w.id?"rgba(255,255,255,0.6)":"#AAA",
                  fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
                  {w.age}yr
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Word detail panel */}
      {expandedWord&&(
        <WordDetailPanel word={expandedWord} user={user}
          onClose={()=>setExpandedWord(null)}/>
      )}

      {/* Add Word Button */}
      <button onClick={()=>setShowAddWordInSee(true)}
        style={{position:"fixed",bottom:80,right:16,width:52,height:52,
        borderRadius:"50%",background:"#5AAB2A",border:"none",
        color:"#fff",fontSize:24,cursor:"pointer",
        boxShadow:"0 4px 16px rgba(90,171,42,0.5)",zIndex:100}}>+</button>

      {/* Add Word Modal in See */}
      {showAddWordInSee&&(
        <AddWordInSeeModal user={user} onClose={()=>setShowAddWordInSee(false)}
          onAdd={w=>{
            // Save to master words and Supabase
            setShowAddWordInSee(false);
          }}/>
      )}
    </div>
  );
}

// ── Reinforcer Survey Screen ──────────────────────────────────────
function ReinforcerSurveyScreen({user, onBack, onSave}){
  const [selected, setSelected] = useState(mem.get(`reinforcers_${user.id}`,{}));
  const [customInputs, setCustomInputs] = useState({});
  const [expandedCat, setExpandedCat] = useState("edibles");

  const toggle = (catId, subcatId, item) => {
    const key = `${catId}_${subcatId}_${item}`;
    setSelected(p=>{
      const updated = {...p, [key]: !p[key]};
      mem.set(`reinforcers_${user.id}`, updated);
      return updated;
    });
  };

  const addCustom = (catId, subcatId) => {
    const key = `custom_${catId}_${subcatId}`;
    const val = customInputs[key]?.trim();
    if(!val) return;
    const itemKey = `${catId}_${subcatId}_${val}`;
    setSelected(p=>{
      const updated = {...p, [itemKey]: true};
      mem.set(`reinforcers_${user.id}`, updated);
      return updated;
    });
    setCustomInputs(p=>({...p,[key]:""}));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:"#F5A623",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12,boxShadow:"0 2px 12px rgba(245,166,35,0.3)"}}>
        <button onClick={()=>{onSave(selected);onBack();}}
          style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:10,
          padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Save & Back</button>
        <div style={{flex:1,fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>
          🌟 Reinforcer Survey
        </div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:700}}>
          {selectedCount} selected
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:12}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#888",
          marginBottom:12,lineHeight:1.6,padding:"10px 14px",background:"#fff",
          borderRadius:12,border:"1px solid #EEF0F4"}}>
          Check items your student prefers. These will appear on the Choice Board and Working For board.
          You can add custom items in each category.
        </div>

        {REINFORCER_SURVEY.map(cat=>(
          <div key={cat.id} style={{marginBottom:10,borderRadius:16,overflow:"hidden",
            boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
            {/* Category header */}
            <button onClick={()=>setExpandedCat(expandedCat===cat.id?null:cat.id)}
              style={{width:"100%",padding:"14px 16px",background:"#fff",border:"none",
              display:"flex",alignItems:"center",gap:10,cursor:"pointer",
              borderBottom:expandedCat===cat.id?"2px solid #F5A623":"none"}}>
              <div style={{fontSize:24}}>{cat.emoji}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#1A1A2E",flex:1,textAlign:"left"}}>
                {cat.label}
              </div>
              <div style={{fontSize:18,color:"#AAA"}}>{expandedCat===cat.id?"▲":"▼"}</div>
            </button>

            {expandedCat===cat.id&&cat.subcats.map(sub=>(
              <div key={sub.id} style={{padding:"12px 16px",background:"#FAFBFC",
                borderBottom:"1px solid #EEF0F4"}}>
                <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,
                  color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                  {sub.label}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
                  {sub.items.map(item=>{
                    const key = `${cat.id}_${sub.id}_${item}`;
                    const isSelected = !!selected[key];
                    return(
                      <button key={item} onClick={()=>toggle(cat.id, sub.id, item)}
                        style={{padding:"6px 14px",borderRadius:20,border:"none",
                        background:isSelected?"#F5A623":"#EEF0F4",
                        color:isSelected?"#fff":"#555",
                        fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",
                        transition:"all 0.15s"}}>
                        {isSelected?"✓ ":""}{item}
                      </button>
                    );
                  })}
                </div>
                {/* Custom item input */}
                <div style={{display:"flex",gap:8}}>
                  <input
                    value={customInputs[`custom_${cat.id}_${sub.id}`]||""}
                    onChange={e=>setCustomInputs(p=>({...p,[`custom_${cat.id}_${sub.id}`]:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&addCustom(cat.id,sub.id)}
                    placeholder="Add custom item..."
                    style={{flex:1,padding:"6px 12px",borderRadius:20,
                    border:"1px solid #DDD",fontFamily:"'Nunito',sans-serif",fontSize:12,outline:"none"}}/>
                  <button onClick={()=>addCustom(cat.id,sub.id)}
                    style={{padding:"6px 14px",borderRadius:20,border:"none",
                    background:"#F5A623",color:"#fff",fontFamily:"'Nunito',sans-serif",
                    fontWeight:800,fontSize:12,cursor:"pointer"}}>Add</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Teach Screen (Student Data Dashboard) ────────────────────────
function TeachScreen({user, students=[], trialData={}, onBack, onManageStudents}){
  const [selectedStu, setSelectedStu] = useState(null);

  const getWordStats = (stuId=null) => {
    const wordCounts = {};
    const entries = stuId
      ? Object.entries(trialData||{}).filter(([k])=>k.startsWith(stuId+"_"))
      : Object.entries(trialData||{});
    entries.forEach(([key,val])=>{
      const wordId = key.split("_").slice(1).join("_");
      if(!wordCounts[wordId]) wordCounts[wordId] = 0;
      wordCounts[wordId] += (val.correct||0);
    });
    return Object.entries(wordCounts)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map(([wid,count])=>({wid,count}));
  };

  const getAvgResponseTime = (stuId=null) => {
    const entries = stuId
      ? Object.entries(trialData||{}).filter(([k])=>k.startsWith(stuId+"_"))
      : Object.entries(trialData||{});
    if(!entries.length) return "N/A";
    const times = entries.map(([,v])=>v.avgTime||0).filter(t=>t>0);
    if(!times.length) return "N/A";
    return (times.reduce((a,b)=>a+b,0)/times.length/1000).toFixed(1)+"s";
  };

  const getCorrectionPraise = (stuId=null) => {
    const entries = stuId
      ? Object.entries(trialData||{}).filter(([k])=>k.startsWith(stuId+"_"))
      : Object.entries(trialData||{});
    const corrections = entries.reduce((a,[,v])=>a+(v.incorrect||0),0);
    const praise      = entries.reduce((a,[,v])=>a+(v.correct||0),0);
    return { corrections, praise };
  };

  const topWords    = getWordStats(selectedStu?.id);
  const avgTime     = getAvgResponseTime(selectedStu?.id);
  const { corrections, praise } = getCorrectionPraise(selectedStu?.id);

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:"#8E44AD",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12,boxShadow:"0 2px 12px rgba(142,68,173,0.3)"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#fff",flex:1}}>
          🎓 Teach
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflowY:"auto"}}>
        {/* Student list - left column */}
        <div style={{width:120,background:"#fff",borderRight:"1px solid #EEF0F4",
          overflowY:"auto",flexShrink:0}}>
          <button onClick={()=>setSelectedStu(null)}
            style={{width:"100%",padding:"12px 8px",background:!selectedStu?"#8E44AD":"transparent",
            border:"none",cursor:"pointer",borderBottom:"1px solid #EEF0F4",
            fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,
            color:!selectedStu?"#fff":"#666"}}>
            📊 Class
          </button>
          {(students||[]).map(s=>(
            <button key={s.id} onClick={()=>setSelectedStu(s)}
              style={{width:"100%",padding:"12px 8px",
              background:selectedStu?.id===s.id?"#F3E5F5":"transparent",
              border:"none",cursor:"pointer",borderBottom:"1px solid #EEF0F4",
              display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:24}}>{s.avatar||"🧑"}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:10,
                color:selectedStu?.id===s.id?"#8E44AD":"#555",textAlign:"center",
                wordBreak:"break-word",lineHeight:1.2}}>{s.name}</div>
            </button>
          ))}
          <button onClick={onManageStudents}
            style={{width:"100%",padding:"10px 8px",background:"transparent",
            border:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif",
            fontSize:10,color:"#5AAB2A",fontWeight:800}}>
            + Add Student
          </button>
        </div>

        {/* Data panel - right */}
        <div style={{flex:1,padding:14,overflowY:"auto"}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#8E44AD",marginBottom:14}}>
            {selectedStu ? selectedStu.name : "Class Overview"}
          </div>

          {/* Words most responded to */}
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:12,
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,
              color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
              Words Most Responded To
            </div>
            {topWords.length>0?(
              topWords.map((w,i)=>(
                <div key={w.wid} style={{display:"flex",justifyContent:"space-between",
                  padding:"5px 0",borderBottom:"1px solid #F0F2F5"}}>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555"}}>
                    {i+1}. {w.wid.replace(/_/g," ")}
                  </div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,
                    color:"#8E44AD"}}>{w.count}</div>
                </div>
              ))
            ):(
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#CCC",textAlign:"center",
                padding:"10px 0"}}>No data yet — start a session!</div>
            )}
          </div>

          {/* Response time */}
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:12,
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,
              color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              Average Response Time
            </div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:32,color:"#1B65B8"}}>
              {avgTime}
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#AAA",marginTop:2}}>
              Time from instruction to correct response
            </div>
          </div>

          {/* Correction & Praise */}
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:12,
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,
              color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
              Corrections & Praise
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"#FFF8EC",borderRadius:10,padding:12,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:4}}>🔄</div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#E67E22"}}>
                  {corrections}
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888"}}>
                  Corrections
                </div>
              </div>
              <div style={{background:"#EAF3DE",borderRadius:10,padding:12,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:4}}>🌟</div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#5AAB2A"}}>
                  {praise}
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888"}}>
                  Praise
                </div>
              </div>
            </div>
          </div>

          {/* Download PDF button */}
          <button onClick={()=>{
            alert("PDF download coming soon! Contact hello@saysee.io to request a progress report.");
          }} style={{width:"100%",padding:"12px",borderRadius:14,border:"2px solid #1B65B8",
            background:"transparent",color:"#1B65B8",fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:14,cursor:"pointer",display:"flex",
            alignItems:"center",justifyContent:"center",gap:8}}>
            📥 Download Progress Report PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Data Screen ──────────────────────────────────────────────────
const NO_DATA_MSG = "Student trials must occur prior to analysis. Recommended that the app is used for a minimum of one school week.";

function DataScreen({user, onBack}){
  const [activeView, setActiveView] = useState(null);
  const trialData = mem.get(`trials_${user.id}`,{});
  const students  = mem.get(`stu_${user.id}`,[]);
  const sessions  = mem.get(`sessions_${user.id}`,[]);

  // Compute stats from actual trial data
  const allTrials     = Object.values(trialData);
  const totalWords    = Object.keys(trialData).length;
  const totalCorrect  = allTrials.reduce((a,t)=>a+(t.correct||0),0);
  const totalIncorrect= allTrials.reduce((a,t)=>a+(t.incorrect||0),0);
  const avgTimes      = allTrials.map(t=>t.avgTime||0).filter(t=>t>0);
  const avgResponse   = avgTimes.length
    ? (avgTimes.reduce((a,b)=>a+b,0)/avgTimes.length/1000).toFixed(1)+"s"
    : "—";
  const hasData       = totalWords > 0;

  const NoDataMsg = ()=>(
    <div style={{background:"#FFF8EC",borderRadius:14,padding:16,
      border:"1px solid #FEEBC8",margin:"0 0 16px"}}>
      <div style={{fontSize:24,marginBottom:8}}>📊</div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#92600A",
        lineHeight:1.7,fontWeight:600}}>{NO_DATA_MSG}</div>
    </div>
  );

  if(activeView==="graphs") return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#1B65B8",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setActiveView(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>📈 Progress Graphs</div>
      </div>
      <div style={{padding:16}}>
        {!hasData&&<NoDataMsg/>}
        {/* Word progress bars */}
        {hasData&&Object.entries(trialData).slice(0,10).map(([key,val])=>{
          const pct = val.correct ? Math.round((val.correct/(val.correct+(val.incorrect||0)))*100) : 0;
          const wordName = key.split("_").slice(1).join(" ") || key;
          return(
            <div key={key} style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,
              boxShadow:"0 2px 6px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#333",
                  textTransform:"capitalize"}}>{wordName}</div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:14,color:"#1B65B8"}}>{pct}%</div>
              </div>
              <div style={{height:10,borderRadius:5,background:"#EEF0F4",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,borderRadius:5,
                  background:`linear-gradient(90deg,${pct>=80?"#5AAB2A":pct>=50?"#F5A623":"#E74C3C"},${pct>=80?"#3d8a1e":pct>=50?"#E67E22":"#C0392B"})`,
                  transition:"width 0.5s ease"}}/>
              </div>
              <div style={{display:"flex",gap:12,marginTop:4}}>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:"#5AAB2A",fontWeight:700}}>✅ {val.correct||0}</span>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:"#E74C3C",fontWeight:700}}>❌ {val.incorrect||0}</span>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:10,color:"#888"}}>Level {val.level||1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if(activeView==="history") return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#8E44AD",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setActiveView(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>📋 Session History</div>
      </div>
      <div style={{padding:16}}>
        {!hasData&&<NoDataMsg/>}
        {hasData&&sessions.length===0&&(
          <div style={{textAlign:"center",padding:40,color:"#CCC",fontFamily:"'Nunito',sans-serif"}}>
            Sessions will appear here after use
          </div>
        )}
        {sessions.map((s,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,
            boxShadow:"0 2px 6px rgba(0,0,0,0.06)"}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#333"}}>
              {new Date(s.date||Date.now()).toLocaleDateString()}
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:2}}>
              {s.wordCount||0} words · {s.correct||0} correct · {s.duration||0}min
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if(activeView==="download") return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#5AAB2A",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setActiveView(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>📥 Progress Reports</div>
      </div>
      <div style={{padding:16}}>
        {!hasData&&<NoDataMsg/>}
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555",
          marginBottom:16,lineHeight:1.6}}>
          Select a student to download their individual progress report as a PDF.
        </div>
        {students.map(s=>(
          <button key={s.id} onClick={()=>alert(`PDF report for ${s.name} — will be generated once sufficient trial data is collected.

${NO_DATA_MSG}`)}
            style={{width:"100%",padding:"14px",borderRadius:14,border:"none",
            background:"#fff",cursor:"pointer",marginBottom:10,
            boxShadow:"0 2px 8px rgba(0,0,0,0.07)",
            display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
            <div style={{fontSize:32}}>{s.avatar||"🧑"}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1A1A2E"}}>{s.name}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>Tap to download PDF report</div>
            </div>
            <div style={{fontSize:20}}>📥</div>
          </button>
        ))}
        {students.length===0&&(
          <div style={{textAlign:"center",padding:30,color:"#CCC",fontFamily:"'Nunito',sans-serif",fontSize:13}}>
            Add students in Settings to generate reports
          </div>
        )}
      </div>
    </div>
  );

  if(activeView==="share") return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#E67E22",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setActiveView(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>📤 Share Report</div>
      </div>
      <div style={{padding:16}}>
        {!hasData&&<NoDataMsg/>}
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555",marginBottom:16,lineHeight:1.6}}>
          Share a student progress report with a parent, specialist, or district administrator.
        </div>
        {students.map(s=>(
          <button key={s.id}
            onClick={()=>{
              const subject = encodeURIComponent(`SaySee™ Progress Report — ${s.name}`);
              const body = encodeURIComponent(`Please find the progress report for ${s.name} attached.

Generated by SaySee™ AAC Visual Learning Platform
hello@saysee.io | saysee.io`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
            style={{width:"100%",padding:"14px",borderRadius:14,border:"none",
            background:"#fff",cursor:"pointer",marginBottom:10,
            boxShadow:"0 2px 8px rgba(0,0,0,0.07)",
            display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
            <div style={{fontSize:32}}>{s.avatar||"🧑"}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1A1A2E"}}>{s.name}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>Tap to share via email</div>
            </div>
            <div style={{fontSize:20}}>📤</div>
          </button>
        ))}
        {students.length===0&&(
          <div style={{textAlign:"center",padding:30,color:"#CCC",fontFamily:"'Nunito',sans-serif",fontSize:13}}>
            Add students in Settings to share reports
          </div>
        )}
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#E67E22",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12,boxShadow:"0 2px 12px rgba(230,126,34,0.3)"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#fff",flex:1}}>
          📊 Data & Reports
        </div>
      </div>
      <div style={{padding:16,flex:1}}>
        {/* Default message if no data */}
        {!hasData&&<NoDataMsg/>}

        {/* Stats tiles */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[
            {label:"Words Practiced", val:hasData?totalWords:"—",   emoji:"📝", color:"#1B65B8"},
            {label:"Total Correct",   val:hasData?totalCorrect:"—", emoji:"✅", color:"#5AAB2A"},
            {label:"Avg Response",    val:avgResponse,               emoji:"⏱️",  color:"#8E44AD"},
            {label:"Corrections",     val:hasData?totalIncorrect:"—",emoji:"🔄", color:"#E67E22"},
          ].map(t=>(
            <div key={t.label} style={{background:"#fff",borderRadius:16,padding:16,
              boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:4}}>
              <div style={{fontSize:24}}>{t.emoji}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:26,color:t.color}}>{t.val}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888",fontWeight:700}}>{t.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {[
          {id:"graphs",   label:"View Progress Graphs",     emoji:"📈", desc:"Visual word-by-word accuracy and level progress", color:"#1B65B8"},
          {id:"download", label:"Download Progress Report", emoji:"📥", desc:"Export PDF for any student",                     color:"#5AAB2A"},
          {id:"history",  label:"Session History",          emoji:"📋", desc:"View past sessions by date",                      color:"#8E44AD"},
          {id:"share",    label:"Share Report",             emoji:"📤", desc:"Send progress report to parent or district",      color:"#E67E22"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setActiveView(t.id)}
            style={{width:"100%",padding:"16px",borderRadius:14,border:"none",
            background:"#fff",cursor:"pointer",marginBottom:10,
            boxShadow:"0 2px 8px rgba(0,0,0,0.07)",
            display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
            <div style={{fontSize:26,width:44,height:44,borderRadius:12,
              background:`${t.color}15`,display:"flex",alignItems:"center",
              justifyContent:"center",flexShrink:0}}>{t.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1A1A2E"}}>
                {t.label}
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:2}}>
                {t.desc}
              </div>
            </div>
            <div style={{color:"#CCC",fontSize:18}}>›</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Settings Screen ───────────────────────────────────────────────
function SettingsScreen({user, onBack, onLogout, onNavigate}){
  const [section, setSection] = useState(null); // null=main|profile|students|subscription

  if(section==="profile") return <ProfileSection user={user} onBack={()=>setSection(null)}/>;
  if(section==="students") return <StudentsSection user={user} onBack={()=>setSection(null)}/>;
  if(section==="subscription") return <SubscriptionSection user={user} onBack={()=>setSection(null)}/>;

  const tiles = [
    {id:"profile",      label:"Edit Profile",      emoji:"👤", desc:"Name, email, avatar",          color:"#1B65B8"},
    {id:"students",     label:"Student Profiles",  emoji:"🧑‍🎓",desc:"Add students, photos, ages",    color:"#5AAB2A"},
    {id:"see",          label:"Word Library",       emoji:"👁️",  desc:"Categories, words, levels",    color:"#8E44AD"},
    {id:"reinforcers",  label:"Reinforcer Survey",  emoji:"🌟", desc:"Set preferred rewards",         color:"#F5A623"},
    {id:"subscription", label:"Subscription",       emoji:"💳", desc:"Plan, billing, status",         color:"#E67E22"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#607D8B",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12,boxShadow:"0 2px 12px rgba(96,125,139,0.3)"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#fff",flex:1}}>
          ⚙️ Settings
        </div>
      </div>

      <div style={{padding:16,flex:1}}>
        {/* User info card */}
        <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:16,
          boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"#EEF5FF",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>
            👤
          </div>
          <div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#1A1A2E"}}>
              {user.name||"Teacher"}
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>
              {user.email}
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
              color:user.plan==="monthly"||user.plan==="annual"||user.plan==="school"?"#5AAB2A":"#E67E22",
              marginTop:2,textTransform:"capitalize"}}>
              {user.plan||"trial"} plan
            </div>
          </div>
        </div>

        {/* Setting tiles */}
        {tiles.map(t=>(
          <button key={t.id}
            onClick={()=>{
              if(t.id==="see"||t.id==="reinforcers") onNavigate(t.id);
              else setSection(t.id);
            }}
            style={{width:"100%",padding:"14px 16px",borderRadius:14,border:"none",
            background:"#fff",cursor:"pointer",marginBottom:10,
            boxShadow:"0 2px 8px rgba(0,0,0,0.07)",
            display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
            <div style={{fontSize:26,width:44,height:44,borderRadius:12,
              background:`${t.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {t.emoji}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1A1A2E"}}>
                {t.label}
              </div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:2}}>
                {t.desc}
              </div>
            </div>
            <div style={{color:"#CCC",fontSize:18}}>›</div>
          </button>
        ))}

        {/* Logout */}
        <button onClick={onLogout}
          style={{width:"100%",padding:"14px",borderRadius:14,border:"2px solid #E74C3C",
          background:"transparent",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:14,cursor:"pointer",marginTop:8}}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Profile Section ───────────────────────────────────────────────
function ProfileSection({user, onBack}){
  const [firstName, setFirstName] = useState((user.name||"").split(" ")[0]||"");
  const [lastName,  setLastName]  = useState((user.name||"").split(" ").slice(1).join(" ")||"");
  const [phone,     setPhone]     = useState(user.phone||"");
  const [school,    setSchool]    = useState(user.school||"");
  const [grade,     setGrade]     = useState(user.grade||"");
  const [photoUrl,  setPhotoUrl]  = useState(mem.get(`profile_photo_${user.id}`)||null);
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  // Generate initials avatar
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  const bgColors = ["#1B65B8","#5AAB2A","#8E44AD","#E67E22","#E74C3C","#16A085"];
  const bgColor  = bgColors[(firstName.charCodeAt(0)||0) % bgColors.length];

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setPhotoUrl(url);
      mem.set(`profile_photo_${user.id}`, url);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedName = `${firstName} ${lastName}`.trim();
    try {
      await supabase.from("accounts").update({
        name: updatedName,
        phone,
        school,
        grade,
      }).eq("id", user.id);
      user.name = updatedName;
      mem.set(`profile_${user.id}`, {name:updatedName, phone, school, grade});
    } catch(e){ console.log("Profile save:", e); }
    setSaved(true);
    setSaving(false);
    setTimeout(()=>setSaved(false), 3000);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#607D8B",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff",flex:1}}>
          Edit Profile
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{background:"#5AAB2A",border:"none",borderRadius:10,
          padding:"6px 16px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>
          {saving?"Saving...":"Save"}
        </button>
      </div>

      <div style={{padding:16}}>
        {/* Profile photo */}
        <div style={{background:"#fff",borderRadius:16,padding:20,
          boxShadow:"0 2px 8px rgba(0,0,0,0.07)",marginBottom:14,textAlign:"center"}}>
          <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
            {photoUrl?(
              <img src={photoUrl} alt="Profile"
                style={{width:90,height:90,borderRadius:"50%",objectFit:"cover",
                border:"3px solid #1B65B8"}}/>
            ):(
              <div style={{width:90,height:90,borderRadius:"50%",background:bgColor,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Fredoka One',cursive",fontSize:32,color:"#fff",
                border:"3px solid #1B65B8"}}>
                {initials}
              </div>
            )}
            <button onClick={()=>fileRef.current?.click()}
              style={{position:"absolute",bottom:0,right:0,width:28,height:28,
              borderRadius:"50%",background:"#1B65B8",border:"2px solid #fff",
              color:"#fff",fontSize:14,cursor:"pointer",display:"flex",
              alignItems:"center",justifyContent:"center"}}>✏️</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
            onChange={handlePhotoUpload}/>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>
            {user.email}
          </div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#AAA",
            marginTop:2,textTransform:"capitalize"}}>{user.role||"teacher"}</div>
        </div>

        {/* Editable fields */}
        <div style={{background:"#fff",borderRadius:16,padding:16,
          boxShadow:"0 2px 8px rgba(0,0,0,0.07)",marginBottom:14}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:800,
            color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>
            Personal Information
          </div>
          {[
            {label:"First Name",   val:firstName, set:setFirstName, placeholder:"First name"},
            {label:"Last Name",    val:lastName,  set:setLastName,  placeholder:"Last name"},
            {label:"Phone",        val:phone,     set:setPhone,     placeholder:"(555) 555-5555", type:"tel"},
          ].map(f=>(
            <div key={f.label} style={{marginBottom:12}}>
              <label style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
                color:"#888",display:"block",marginBottom:4}}>{f.label}</label>
              <input value={f.val} onChange={e=>f.set(e.target.value)}
                placeholder={f.placeholder} type={f.type||"text"}
                style={{width:"100%",padding:"11px 12px",borderRadius:10,
                border:"2px solid #EEF0F4",fontFamily:"'Nunito',sans-serif",
                fontSize:13,outline:"none",boxSizing:"border-box",
                transition:"border 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#1B65B8"}
                onBlur={e=>e.target.style.borderColor="#EEF0F4"}/>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:16,
          boxShadow:"0 2px 8px rgba(0,0,0,0.07)",marginBottom:14}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:800,
            color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>
            School Information
          </div>
          {[
            {label:"School / Institution", val:school, set:setSchool, placeholder:"School name"},
            {label:"Grade / Class",        val:grade,  set:setGrade,  placeholder:"e.g. 3rd Grade, SDC"},
          ].map(f=>(
            <div key={f.label} style={{marginBottom:12}}>
              <label style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
                color:"#888",display:"block",marginBottom:4}}>{f.label}</label>
              <input value={f.val} onChange={e=>f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{width:"100%",padding:"11px 12px",borderRadius:10,
                border:"2px solid #EEF0F4",fontFamily:"'Nunito',sans-serif",
                fontSize:13,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor="#1B65B8"}
                onBlur={e=>e.target.style.borderColor="#EEF0F4"}/>
            </div>
          ))}
        </div>

        {saved&&(
          <div style={{padding:"12px 16px",borderRadius:12,background:"#EAF3DE",
            border:"1px solid #C8E6B0",fontFamily:"'Nunito',sans-serif",fontSize:13,
            color:"#3D8A1A",fontWeight:700,textAlign:"center",marginBottom:14}}>
            ✅ Profile saved successfully!
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{width:"100%",padding:"13px",borderRadius:30,border:"none",
          background:saving?"#EEF0F4":"#1B65B8",
          color:saving?"#AAA":"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:14,cursor:saving?"not-allowed":"pointer"}}>
          {saving?"Saving...":"Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Students Section (in Settings) ───────────────────────────────
function StudentsSection({user, onBack}){
  const [students, setStudents] = useState(mem.get(`stu_${user.id}`)||[]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newAvatar, setNewAvatar] = useState("🧑");
  const [editStu, setEditStu] = useState(null);

  const avatars = ["🧑","👦","👧","🧒","👶","🐻","🐼","🦊","🐸","🦁","🐯","🦄","🐙","🦋","🐬"];
  const ageToDevBand = (age) => {
    const a = parseInt(age);
    if(a<=2) return "0-2";
    if(a<=4) return "3-4";
    if(a<=6) return "5-6";
    return "7-8";
  };

  const addStudent = async () => {
    if(!newName.trim()) return;
    const stu = {
      id:`s_${Date.now()}`,
      name:newName.trim(),
      avatar:newAvatar,
      age:newAge,
      devBand:ageToDevBand(newAge),
      color:"#1B65B8",
      level:1,
    };
    const updated = [...students, stu];
    setStudents(updated);
    mem.set(`stu_${user.id}`, updated);
    try { await sbAuth.saveStudent(stu, user.id); } catch(e){}
    setNewName(""); setNewAge(""); setNewAvatar("🧑");
    setAdding(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#5AAB2A",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff",flex:1}}>
          Student Profiles
        </div>
        <button onClick={()=>setAdding(true)}
          style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:10,
          padding:"6px 14px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>+ Add</button>
      </div>

      <div style={{padding:16}}>
        {/* Add student form */}
        {adding&&(
          <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,
            boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#5AAB2A",marginBottom:12}}>
              New Student
            </div>
            <input value={newName} onChange={e=>setNewName(e.target.value)}
              placeholder="Student first name or nickname *"
              style={{width:"100%",padding:"11px",borderRadius:10,border:"2px solid #EEF0F4",
              fontFamily:"'Nunito',sans-serif",fontSize:14,outline:"none",
              boxSizing:"border-box",marginBottom:10}}/>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input value={newAge} onChange={e=>setNewAge(e.target.value)}
                placeholder="Age (optional)" type="number" min="1" max="18"
                style={{flex:1,padding:"11px",borderRadius:10,border:"2px solid #EEF0F4",
                fontFamily:"'Nunito',sans-serif",fontSize:14,outline:"none"}}/>
              {newAge&&(
                <div style={{padding:"11px 14px",borderRadius:10,background:"#EAF3DE",
                  fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:700,color:"#3D8A1A",
                  display:"flex",alignItems:"center"}}>
                  {ageToDevBand(newAge)} yr words
                </div>
              )}
            </div>
            {/* Avatar picker */}
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",
              fontWeight:700,marginBottom:8}}>Choose Avatar</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
              {avatars.map(a=>(
                <button key={a} onClick={()=>setNewAvatar(a)}
                  style={{fontSize:24,width:40,height:40,borderRadius:10,border:"none",
                  background:newAvatar===a?"#5AAB2A22":"#F0F2F5",cursor:"pointer",
                  boxShadow:newAvatar===a?"0 0 0 2px #5AAB2A":"none"}}>
                  {a}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setAdding(false)}
                style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid #EEF0F4",
                background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,
                fontSize:13,cursor:"pointer",color:"#888"}}>Cancel</button>
              <button onClick={addStudent}
                style={{flex:2,padding:"10px",borderRadius:10,border:"none",
                background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",
                fontWeight:800,fontSize:13,cursor:"pointer"}}>Save Student</button>
            </div>
          </div>
        )}

        {/* Student list */}
        {students.length===0&&!adding&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:"#CCC",
            fontFamily:"'Nunito',sans-serif",fontSize:14}}>
            No students yet — tap + Add to get started
          </div>
        )}
        {students.map(s=>(
          <div key={s.id} style={{background:"#fff",borderRadius:14,padding:14,
            marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
            display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:36}}>{s.avatar||"🧑"}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,
                color:"#1A1A2E"}}>{s.name}</div>
              {s.age&&(
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:2}}>
                  Age {s.age} · {s.devBand||ageToDevBand(s.age)} yr words
                </div>
              )}
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#5AAB2A",
                fontWeight:700,marginTop:2}}>Level {s.level||1}</div>
            </div>
            <button onClick={()=>setEditStu(editStu?.id===s.id?null:s)}
              style={{background:"#F0F2F5",border:"none",borderRadius:8,
              padding:"6px 12px",cursor:"pointer",fontSize:14}}>✏️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Subscription Section (in Settings) ───────────────────────────
function SubscriptionSection({user, onBack}){
  const [showStripe, setShowStripe] = useState(false);
  const [stripePlan, setStripePlan] = useState("monthly");
  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB"}}>
      <div style={{background:"#E67E22",padding:"14px 16px",display:"flex",
        alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.2)",border:"none",
          borderRadius:10,padding:"6px 12px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>
          Subscription
        </div>
      </div>
      <div style={{padding:16}}>
        {/* Current plan */}
        <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,
          boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",
            fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
            Current Plan
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,
              color:user.plan==="monthly"||user.plan==="annual"||user.plan==="school"?"#5AAB2A":"#E67E22",
              textTransform:"capitalize"}}>
              {user.plan==="monthly"?"Monthly ✅":
               user.plan==="annual"?"Annual ✅":
               user.plan==="school"?"School Site ✅":
               user.plan==="admin"?"Admin ✅":"Free Trial ⏰"}
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>
              {user.plan==="monthly"?"$28/month":
               user.plan==="annual"?"$252/year":
               user.plan==="school"?"Custom":""}
            </div>
          </div>
          {user.plan==="monthly"&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:4}}>Up to 28 students · Cancel anytime</div>}
          {user.plan==="annual"&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:4}}>Up to 28 students · Best value</div>}
          {(user.plan==="trial"||!user.plan)&&(
            <div style={{marginTop:10}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#E67E22",
                fontWeight:700,marginBottom:10}}>Subscribe to keep full access:</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setStripePlan("monthly");setShowStripe(true);}}
                  style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid #1B65B8",
                  background:"transparent",color:"#1B65B8",fontFamily:"'Nunito',sans-serif",
                  fontWeight:800,fontSize:12,cursor:"pointer"}}>
                  Monthly<br/>$28/mo
                </button>
                <button onClick={()=>{setStripePlan("annual");setShowStripe(true);}}
                  style={{flex:1,padding:"10px",borderRadius:10,border:"none",
                  background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",
                  fontWeight:800,fontSize:12,cursor:"pointer"}}>
                  Annual ⭐<br/>$252/yr
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change plan request */}
        <div style={{background:"#fff",borderRadius:16,padding:16,
          boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#888",
            lineHeight:1.7,marginBottom:10}}>
            To upgrade, downgrade, or cancel your subscription contact us — we'll take care of it within 24 hours.
          </div>
          <a href="mailto:hello@saysee.io?subject=Subscription Change Request"
            style={{display:"block",padding:"12px",borderRadius:10,background:"#1B65B8",
            color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,
            textDecoration:"none",textAlign:"center"}}>
            ✉️ Contact Us to Make Changes
          </a>
        </div>
      </div>

      {/* Stripe payment modal */}
      {showStripe&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
          <PaymentForm user={user} plan={stripePlan}
            onSuccess={()=>setShowStripe(false)}
            onCancel={()=>setShowStripe(false)}/>
        </div>
      )}
    </div>
  );
}


// ── Word-Specific Visual Alternatives Library ─────────────────────
// Each entry: { l1: "AI image guide", l2: [color emojis], l3: [bw descriptions] }
const WORD_VISUALS = {
  // ── Core words ───────────────────────────────────────────────
  "yes":       { l1:"A person nodding with a big smile, thumbs up gesture, bright background",
                 l2:["✅","👍","🟢","☑️","💚","🙂"], l3:["☑","✓","⬜✓","▢✓","□✓","✔"] },
  "no":        { l1:"A person shaking their head, hand out in stop gesture, clear background",
                 l2:["❌","🚫","🛑","👎","🔴","✋"], l3:["✗","⬜✗","□✗","▢✗","✕","—"] },
  "more":      { l1:"Two hands touching fingertips together, the ASL sign for more",
                 l2:["➕","🔢","👐","🤲","💫","🔁"], l3:["++","▲","△","⬆",">>","»"] },
  "help":      { l1:"One hand lifting the other fist — the ASL sign for help, plain background",
                 l2:["🙋","🤝","💪","🆘","🫂","🙌"], l3:["☎","⬛?","□↑","▢↑","⇑","↑"] },
  "please":    { l1:"An open hand rubbing a circle on the chest, ASL sign for please",
                 l2:["🙏","💛","😊","🌟","✨","💕"], l3:["○","◯","⊙","●","◎","☯"] },
  "mine":      { l1:"A fist tapping the chest, ASL sign for mine, clear background",
                 l2:["👐","🫵","💎","🏠","🎒","⭐"], l3:["◀","←","⊂","◁","▷←","▢←"] },
  "up":        { l1:"A hand with index finger pointing upward, arrow going up, clear background",
                 l2:["⬆️","☝️","🔼","🆙","🚀","📈"], l3:["↑","⇑","▲","△","⬆","↟"] },
  "down":      { l1:"A hand pointing downward, arrow going down, clear background",
                 l2:["⬇️","👇","🔽","📉","⏬","🪂"], l3:["↓","⇓","▼","▽","⬇","↡"] },
  "on":        { l1:"A light switch in the ON position with light bulb lit, clear background",
                 l2:["💡","🔛","✅","🟢","☀️","⚡"], l3:["▣","◼","●","■","▪","◉"] },
  "off":       { l1:"A light switch in the OFF position, light bulb unlit, clear background",
                 l2:["🔴","⭕","🔕","❌","🌑","💤"], l3:["○","◯","□","▢","⬜","△"] },
  // ── Daily needs ──────────────────────────────────────────────
  "eat":       { l1:"A child sitting at a table with a plate of food, fork in hand, smiling",
                 l2:["🍽️","🥄","🍴","😋","🥘","🧆"], l3:["□→○","▢→●","□food","plate","fork","bowl"] },
  "drink":     { l1:"A child holding a cup to their mouth taking a sip, clear background",
                 l2:["🥤","🧃","🍵","💧","🥛","🫗"], l3:["▢↑","cup","□drink","glass","▢→","bottle"] },
  "sleep":     { l1:"A child in bed with eyes closed, pillow and blanket, moonlight window",
                 l2:["😴","🛏️","🌙","💤","🌛","🧸"], l3:["zz","ZZZ","○○","●bed","□zz","◯sleep"] },
  "bath":      { l1:"A bathtub with bubbles and rubber duck, warm water running",
                 l2:["🛁","🧼","🫧","💦","🦆","🚿"], l3:["▢water","□tub","◯bubble","□bath","▢~","○○○"] },
  "potty":     { l1:"A toilet with seat up in a clean bathroom, clear simple image",
                 l2:["🚽","🚻","🧻","🚾","🪠","🏠"], l3:["□seat","▢◯","toilet","▢wc","□room","◯wc"] },
  "milk":      { l1:"A tall glass of cold white milk on a white table, clear background",
                 l2:["🥛","🐄","🍼","⬜","🌾","🧆"], l3:["▢◯","□milk","glass","▢white","○cup","□lg"] },
  "water":     { l1:"A clear glass of water with ripples, on a table, simple background",
                 l2:["💧","🌊","🚰","💦","🫗","🧊"], l3:["~","≈","▢~","□water","◯~","≋"] },
  "snack":     { l1:"A small plate with apple slices, crackers, and cheese on a table",
                 l2:["🍎","🍪","🧀","🥨","🍇","🥕"], l3:["□plate","▢food","○○○","□snack","▢small","●●"] },
  // ── People ───────────────────────────────────────────────────
  "mom":       { l1:"A smiling woman with arms open wide in a warm, inviting pose, home background",
                 l2:["👩","🤱","💝","👩‍👦","🏠","💕"], l3:["♀","□mom","▢person","○♀","woman","▢♀"] },
  "dad":       { l1:"A smiling man with arms open wide, casual clothing, warm background",
                 l2:["👨","👨‍👦","💪","🏠","⭐","💙"], l3:["♂","□dad","▢person","○♂","man","▢♂"] },
  "baby":      { l1:"A smiling baby in a onesie, sitting up, clear warm background",
                 l2:["👶","🍼","🧸","🌸","🏠","💛"], l3:["○small","▢baby","□little","◯tiny","●small","▢◯"] },
  "teacher":   { l1:"A teacher standing at a whiteboard with a marker, classroom background",
                 l2:["👩‍🏫","📚","✏️","🏫","🎓","📋"], l3:["▢person","□teacher","▢board","◉teach","□✓","▢↑"] },
  "friend":    { l1:"Two children smiling and standing side by side, playground background",
                 l2:["🤝","👫","💛","😊","🫂","🌟"], l3:["○○","▢▢","□□","◯◯","●●","▢=▢"] },
  "doctor":    { l1:"A doctor in white coat with stethoscope, smiling, clinic background",
                 l2:["👨‍⚕️","🩺","🏥","💊","❤️‍🩹","🌡️"], l3:["□+","▢dr","◉health","□doc","▢✚","○+"] },
  // ── Emotions ─────────────────────────────────────────────────
  "happy":     { l1:"A child with a big genuine smile, arms slightly raised in joy, bright background",
                 l2:["😊","😄","🌟","☀️","🎉","💛"], l3:["◠","○smile","▢:)","□happy","◯☺","▢◠"] },
  "sad":       { l1:"A child with a frowning face, looking down, maybe a single tear",
                 l2:["😢","😔","💙","🌧️","☁️","😞"], l3:["◡","○frown","▢:(","□sad","◯☹","▢◡"] },
  "angry":     { l1:"A child with furrowed brows and clenched fists, red face, clear background",
                 l2:["😠","😡","🔴","💢","⚡","🌋"], l3:["▼▼","□angry","▢>:<","◯frown","□mad","▢!!"] },
  "scared":    { l1:"A child with wide open eyes, hands on cheeks, startled expression",
                 l2:["😨","😱","👻","🙈","💨","⚡"], l3:["○○big","□!","▢scared","◯wide","□oh!","▢!!"] },
  "tired":     { l1:"A child yawning with droopy eyes, slumped posture, soft background",
                 l2:["😫","😴","💤","🌙","🥱","🛌"], l3:["zz","▢—","□tired","◯sleep","▢zzz","○—"] },
  "excited":   { l1:"A child jumping in the air with arms raised, huge smile, bright background",
                 l2:["🤩","🎉","⭐","🎊","✨","🚀"], l3:["↑↑","□!!","▢jump","◯!","□excited","▢★"] },
  "frustrated":{ l1:"A child with arms crossed, furrowed brow, looking to the side",
                 l2:["😤","💢","🌩️","😒","🔴","😾"], l3:["□><","▢!!","◯frown","▢cross","□!","▢—"] },
  "calm":      { l1:"A child sitting cross-legged, eyes half closed, peaceful expression, soft light",
                 l2:["😌","🌿","💚","🧘","☁️","🌊"], l3:["○~","▢—","□calm","◯soft","▢slow","○peace"] },
  "proud":     { l1:"A child holding up a certificate or trophy, chest puffed out, big smile",
                 l2:["🏆","⭐","🎖️","💛","👏","✨"], l3:["★","□★","▢trophy","◯win","□proud","▢↑★"] },
  // ── Actions ──────────────────────────────────────────────────
  "run":       { l1:"A child running on a path outdoors, legs in stride, arms pumping, sunny day",
                 l2:["🏃","👟","💨","⚡","🌬️","🏁"], l3:["→→","□fast","▢run","◯→","□>>","▢>>"] },
  "jump":      { l1:"A child jumping in the air both feet off ground, arms up, clear background",
                 l2:["⬆️","🦘","🎯","🌟","⚡","🏃"], l3:["↑↑","□jump","▢↑","◯up","□leap","▢↟"] },
  "play":      { l1:"Two children playing with blocks on a colorful mat, smiling and engaged",
                 l2:["🎮","🧸","🎯","🎪","🎲","⚽"], l3:["□○△","▢play","◯fun","□game","▢toys","○▢△"] },
  "dance":     { l1:"A child dancing with arms out and one leg raised, music notes around them",
                 l2:["💃","🎵","🎶","🌈","⭐","🕺"], l3:["♪","♫","□dance","▢move","◯spin","▢♩"] },
  "draw":      { l1:"A child's hand holding a crayon drawing a picture on paper, close up",
                 l2:["✏️","🖍️","🎨","📝","🖊️","🎭"], l3:["□line","▢draw","◯art","▢/","□pencil","—/—"] },
  "sit":       { l1:"A child sitting in a chair with feet on floor, hands on lap, good posture",
                 l2:["🪑","⬇️","🏠","📚","🎒","🏫"], l3:["□sit","▢down","◯chair","□⬇","▢chair","○⬇"] },
  "stop":      { l1:"A stop sign, or a hand held palm outward in the universal stop gesture",
                 l2:["🛑","✋","⛔","🔴","🚫","❌"], l3:["▢stop","□STOP","■■","▢×","□halt","▢!"] },
  "wait":      { l1:"A child sitting with hands folded in lap, patient expression, calm posture",
                 l2:["⏳","🕐","🤚","💤","⏱️","🌿"], l3:["…","□wait","▢...","◯—","□pause","▢≡"] },
  "clean":     { l1:"A child wiping a table with a sponge or putting toys in a bin, focused",
                 l2:["🧹","🧽","🫧","✨","🗑️","🧺"], l3:["□clean","▢neat","◯tidy","□○","▢wipe","○○"] },
  // ── Classroom items ──────────────────────────────────────────
  "pencil":    { l1:"A yellow sharpened pencil lying on a clean white desk, top-down view",
                 l2:["✏️","🖊️","📝","🖍️","📏","📐"], l3:["—/","□pencil","▢line","—|","□write","▢—"] },
  "paper":     { l1:"A blank white sheet of paper on a desk, slightly turned, clean background",
                 l2:["📄","📝","🗒️","📃","📋","🗞️"], l3:["□","▢","◻","□paper","▢sheet","◻—"] },
  "book":      { l1:"An open children's picture book showing colorful illustrations, on a table",
                 l2:["📚","📖","📕","🔖","🎒","📗"], l3:["□□","▢book","◻open","□read","▢pages","▭"] },
  "backpack":  { l1:"A child's colorful backpack hanging on a hook or sitting on a chair",
                 l2:["🎒","🏫","📚","✏️","🏃","🎨"], l3:["□bag","▢pack","◻bag","□school","▢carry","○bag"] },
  "scissors":  { l1:"A pair of safety scissors open on a white desk, from above",
                 l2:["✂️","✏️","🎨","📝","🖍️","📐"], l3:["✗","□cut","▢×","◯✗","□snip","×"] },
  "chair":     { l1:"A child-sized classroom chair, simple four legs and back, on classroom floor",
                 l2:["🪑","⬇️","🏫","📚","🏠","🛋️"], l3:["□sit","▢chair","◻seat","□⬇","▢—","◻⬇"] },
  // ── Food ─────────────────────────────────────────────────────
  "apple":     { l1:"A bright red apple on a white table, leaves visible, clean simple shot",
                 l2:["🍎","🍏","🍐","🍊","🍋","🍓"], l3:["○apple","▢round","◯○","□fruit","▢○red","○—"] },
  "banana":    { l1:"A yellow banana slightly curved on a white background, simple and clear",
                 l2:["🍌","🍋","🌽","🍑","🟡","🌙"], l3:["⌒","▢curve","□banana","◡","▢⌒","○⌒"] },
  "cookie":    { l1:"A round chocolate chip cookie on a white plate, close-up overhead view",
                 l2:["🍪","🎂","🧁","🍩","🍫","🟤"], l3:["○●","□cookie","▢round","◯●","□circle","●○"] },
  "pizza":     { l1:"A triangle slice of cheese pizza on a plate, overhead view, simple",
                 l2:["🍕","🧀","🍅","🫕","🔺","🍴"], l3:["△","▲pizza","□triangle","◭","▢△","△—"] },
  "sandwich":  { l1:"A simple sandwich with bread, lettuce and cheese on a plate, side view",
                 l2:["🥪","🍞","🧀","🥬","🍅","🫕"], l3:["▭▭","□sandwich","▢layers","◻stack","▭=▭","▭"] },
  // ── Animals ──────────────────────────────────────────────────
  "dog":       { l1:"A friendly golden retriever puppy sitting and looking at camera, plain background",
                 l2:["🐶","🐕","🦴","🐾","🏠","🎾"], l3:["□dog","▢ears","◯•◯","□paws","▢woof","○◯"] },
  "cat":       { l1:"An orange tabby cat sitting upright looking at camera, clean background",
                 l2:["🐱","🐈","🐾","🧶","🌙","🎀"], l3:["△ears","□cat","▢whiskers","◯•","□meow","▢△"] },
  "bird":      { l1:"A small blue and yellow bird perched on a branch, clean simple background",
                 l2:["🐦","🦜","🐣","🕊️","🌿","🌸"], l3:["▷wings","□bird","▢fly","◯beak","□tweet","△wings"] },
  "fish":      { l1:"A bright orange goldfish in clear water, side view, simple background",
                 l2:["🐟","🐠","🐡","🌊","💧","🎣"], l3:["◁fin","□fish","▢swim","◯scales","□fin","▷◁"] },
  // ── Health & Safety ──────────────────────────────────────────
  "sick":      { l1:"A child in bed with a thermometer in mouth, looking tired, blanket pulled up",
                 l2:["🤒","🌡️","🤧","💊","🛌","💙"], l3:["□sick","▢frown","◯—","□ill","▢◡","○×"] },
  "hurt":      { l1:"A child's arm or knee with a colorful band-aid on it, close-up",
                 l2:["🤕","❤️‍🩹","💊","🩹","😢","🏥"], l3:["□hurt","▢ouch","◯×","□pain","▢aid","×"] },
  "danger":    { l1:"A yellow warning triangle sign with exclamation mark, bold and clear",
                 l2:["⚠️","🚫","🔴","🛑","⛔","💢"], l3:["△!","▲!","□danger","▢warn","△⚠","▲×"] },
  // ── Community ────────────────────────────────────────────────
  "bus":       { l1:"A yellow school bus on a road, side view, sunny day, clear simple image",
                 l2:["🚌","🏫","🚍","🛣️","⭐","🎒"], l3:["▭bus","□school bus","▢▭","□ride","▢yellow","▭→"] },
  "store":     { l1:"A simple grocery store storefront with a shopping cart out front",
                 l2:["🏪","🛒","🛍️","🏬","💰","🍎"], l3:["□store","▢shop","◻front","□buy","▢cart","▭shop"] },
  "library":   { l1:"Rows of colorful books on wooden shelves in a bright library",
                 l2:["📚","🏛️","📖","🔖","🪑","🌟"], l3:["▭▭▭","□books","▢shelf","◻row","□read","▢▭▭"] },
  // ── Playground ───────────────────────────────────────────────
  "swing":     { l1:"A child on a playground swing, legs out in the air, big smile, sunny day",
                 l2:["🎠","⬆️","🌟","🏃","☀️","🌳"], l3:["⌒seat","□swing","▢arc","◡hang","□←→","▢⌒"] },
  "slide":     { l1:"A red plastic playground slide with a child at the top about to go down",
                 l2:["🛝","⬇️","🎉","🌈","⭐","🏃"], l3:["slope","□slide","▢down","◭","□/","—"] },
};

// ── Word Detail Panel (See Screen) ───────────────────────────────
function WordDetailPanel({word, user, onClose}){
  const [activeLevel, setActiveLevel] = useState(1);
  const [aiImageUrl, setAiImageUrl]   = useState(null);
  const [unsplashUrl, setUnsplashUrl] = useState(
    mem.get(`word_img_${(word.word||word.id||'').toLowerCase()}`, null)
  );
  const [imgLoading, setImgLoading]   = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [aiError, setAiError]         = useState("");
  const [selectedL2, setSelectedL2]   = useState(0);
  const [customPhoto, setCustomPhoto] = useState(
    mem.get(`word_photo_${word.id||word.word}_${user?.id}`, null)
  );
  const [l4Color, setL4Color]         = useState("#1B65B8");
  const [l4Font, setL4Font]           = useState("'Fredoka One',cursive");
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  // Word-specific visuals
  const wordKey  = (word.word||"").toLowerCase().replace(/[^a-z]/g,"");
  const visuals  = WORD_VISUALS[wordKey] || null;
  const l2Alts   = visuals?.l2 || [word.emoji,"🖼️","🎨","✨","💫","⭐"];
  const l1Guide  = visuals?.l1 || `A clear, realistic photograph of "${word.display||word.word}" on a plain white background, suitable for a child with autism. Single subject, no clutter, bright and unambiguous.`;

  // Currently selected L2 emoji
  const currentL2Emoji = l2Alts[selectedL2] || word.emoji;

  // Auto-show image on mount — prebuilt first, then AI
  // Auto-fetch real image on mount
  useEffect(()=>{
    if(!aiImageUrl && l1Guide) setAiImageUrl(l1Guide);
    if(!customPhoto && !unsplashUrl) fetchWordImage();
  },[]);

  const fetchWordImage = async (forceNew=false) => {
    setImgLoading(true);

    const wordStr = (word.display||word.word||'').toLowerCase().trim();
    const cacheKey = `word_img_v4_${wordStr.replace(/\s+/g,'_')}`;

    // Clear cache on forceNew
    if(forceNew) mem.set(cacheKey, null);

    // Check cache first (skip if forceNew)
    if(!forceNew){
      const cached = mem.get(cacheKey, null);
      if(cached){ setUnsplashUrl(cached); setImgLoading(false); return; }
    }

    const PEXELS_KEY = import.meta.env.VITE_PEXELS_KEY || '';

    // ── Highly specific AAC word → Pexels query map ──────────────
    // Every query is hand-crafted to return exactly the right image
    const QUERY_MAP = {
      // Principle: ONE clear subject, plain/white background, no clutter.
      // Needs & requests (single child, simple background)
      'yes':         'child thumbs up plain background',
      'no':          'child hand stop plain background',
      'more':        'child hand reaching plain background',
      'help':        'child raising hand plain background',
      'please':      'child hands together plain background',
      'stop':        'red stop sign white background',
      'wait':        'child sitting still plain background',
      'go':          'green arrow white background',
      'want':        'child reaching hand plain background',
      'mine':        'child hugging toy plain background',
      'done':        'empty plate white background',
      'open':        'open door plain background',
      'close':       'closed door plain background',
      'on':          'light bulb on white background',
      'off':         'light bulb off white background',
      'up':          'arrow pointing up white background',
      'down':        'arrow pointing down white background',
      'in':          'open box white background',
      'out':         'child outdoors plain background',
      // Bathroom / hygiene
      'potty':       'white toilet plain background',
      'bathroom':    'white toilet plain background',
      'restroom':    'restroom sign white background',
      'wash':        'child washing hands plain background',
      'bath':        'rubber duck bathtub plain background',
      'brush teeth': 'toothbrush toothpaste white background',
      'flush':       'white toilet plain background',
      // Food & drink (clean product-style, isolated)
      'eat':         'child eating plain background',
      'drink':       'child drinking cup plain background',
      'hungry':      'empty plate white background',
      'thirsty':     'glass of water white background',
      'breakfast':   'bowl of cereal white background',
      'lunch':       'sandwich on plate white background',
      'dinner':      'plate of food white background',
      'snack':       'apple slices white background',
      'water':       'glass of water white background',
      'milk':        'glass of milk white background',
      'juice':       'glass of juice white background',
      'apple':       'single red apple white background',
      'banana':      'single banana white background',
      'cookie':      'single cookie white background',
      'pizza':       'pizza slice white background',
      'sandwich':    'sandwich white background',
      // Sleep & rest
      'sleep':       'child sleeping plain background',
      'tired':       'child yawning plain background',
      'rest':        'child resting plain background',
      // Emotions (single child face, plain background)
      'happy':       'happy child face plain background',
      'sad':         'sad child face plain background',
      'angry':       'angry child face plain background',
      'scared':      'scared child face plain background',
      'excited':     'excited child face plain background',
      'calm':        'calm child face plain background',
      'worried':     'worried child face plain background',
      'proud':       'proud child smiling plain background',
      'frustrated':  'frustrated child face plain background',
      'hurt':        'child with bandage plain background',
      'sick':        'child holding thermometer plain background',
      // Actions (one child, simple background)
      'sit':         'child sitting chair plain background',
      'sit down':    'child sitting chair plain background',
      'stand':       'child standing plain background',
      'stand up':    'child standing plain background',
      'walk':        'child walking plain background',
      'run':         'child running plain background',
      'jump':        'child jumping plain background',
      'play':        'child playing toy plain background',
      'dance':       'child dancing plain background',
      'draw':        'child drawing plain background',
      'read':        'child reading book plain background',
      'write':       'child writing plain background',
      'listen':      'child listening plain background',
      'look':        'child pointing plain background',
      'clean up':    'child tidying toys plain background',
      'clean':       'child wiping table plain background',
      'line up':     'children standing in line plain background',
      'be quiet':    'child finger on lips plain background',
      'come':        'child waving come plain background',
      'wait here':   'child standing still plain background',
      // School items (isolated objects)
      'pencil':      'single yellow pencil white background',
      'crayon':      'crayons white background',
      'scissors':    'safety scissors white background',
      'paper':       'sheet of paper white background',
      'book':        'single book white background',
      'backpack':    'school backpack white background',
      'chair':       'single chair white background',
      'table':       'small table white background',
      'computer':    'laptop computer white background',
      'tablet':      'tablet device white background',
      'marker':      'markers white background',
      'glue':        'glue stick white background',
      // People (single person, plain background)
      'mom':         'smiling mother plain background',
      'dad':         'smiling father plain background',
      'baby':        'smiling baby plain background',
      'teacher':     'smiling teacher plain background',
      'friend':      'two children smiling plain background',
      'doctor':      'doctor plain background',
      'nurse':       'nurse plain background',
      // Animals (single animal, plain background)
      'dog':         'single dog plain background',
      'cat':         'single cat plain background',
      'bird':        'single bird plain background',
      'fish':        'single goldfish plain background',
      'rabbit':      'single rabbit plain background',
      // Places
      'home':        'house white background',
      'school':      'school building plain background',
      'park':        'playground plain background',
      'store':       'shopping cart white background',
      'bus':         'yellow school bus white background',
      'car':         'single car white background',
      // Health & safety
      'medicine':    'medicine bottle white background',
      'bandage':     'adhesive bandage white background',
      'danger':      'warning sign white background',
      'hot':         'red thermometer white background',
      'cold':        'snowflake white background',
      // Good behavior
      'good job':    'gold star white background',
      'nice work':   'gold star sticker white background',
      'thank you':   'child waving plain background',
      'sorry':       'sad child face plain background',
      // Clothing (isolated)
      'shoes':       'pair of shoes white background',
      'coat':        'winter coat white background',
      'hat':         'hat white background',
    };

    // Get the search query — map first, then Claude AI for custom words
    let searchQuery = QUERY_MAP[wordStr] || QUERY_MAP[word.word?.toLowerCase()];

    if(!searchQuery && PEXELS_KEY){
      // Use Claude to generate a precise query for words not in the map
      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 40,
            messages: [{
              role: 'user',
              content: `Give a Pexels photo search query for the AAC word "${wordStr}", for a child with autism learning language. The photo MUST be a single clear subject on a plain or white background, no clutter, no text, COLOR. For objects use "single X white background". For actions/feelings use "child X plain background". 3-5 words. Reply with ONLY the query.`
            }]
          })
        });
        if(aiRes.ok){
          const aiJson = await aiRes.json();
          const q = aiJson.content?.[0]?.text?.trim().replace(/['"".]/g,'').toLowerCase();
          if(q && q.length > 2 && q.length < 50) searchQuery = q;
        }
      } catch(e){ console.log('AI query err:', e.message); }
    }

    // Final fallback
    if(!searchQuery) searchQuery = `${wordStr} plain white background`;

    // ── Search Pexels (high quality) ──────────────────────────────
    if(PEXELS_KEY){
      try {
        const page = forceNew ? Math.floor(Math.random()*3)+1 : 1;
        const pexRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=8&page=${page}&orientation=square&size=large`,
          { headers: { Authorization: PEXELS_KEY } }
        );
        if(pexRes.ok){
          const pexData = await pexRes.json();
          const photos = pexData.photos || [];
          if(photos.length > 0){
            const pick = forceNew
              ? photos[Math.floor(Math.random()*photos.length)]
              : photos[0];
            // Prefer the large/high-res source for a crisp Level-1 image
            const s = pick?.src || {};
            const imgUrl = s.large2x || s.large || s.medium || s.original || s.small;
            if(imgUrl){
              setUnsplashUrl(imgUrl);
              mem.set(cacheKey, imgUrl);
              setImgLoading(false);
              return;
            }
          }
        }
      } catch(e){ console.log('Pexels error:', e.message); }
    } else {
      // No Pexels key configured — surface a clear status to the teacher
      setAiError && setAiError("Add VITE_PEXELS_KEY in Vercel to auto-load photos.");
    }

    setImgLoading(false);
  };

  const generateAIImage = async () => {
    // Show prebuilt guide immediately — no API needed
    if(l1Guide && !aiImageUrl){
      setAiImageUrl(l1Guide);
      return;
    }
    // Call AI for custom words not in the library
    setGenerating(true);
    setAiError("");
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:400,
          messages:[{role:"user",content:`For the AAC word "${word.display||word.word}", describe the ideal realistic photo for a child with autism. Single subject, plain background, concrete. 2 sentences. Then list 3 Unsplash search terms.

DESCRIPTION: [here]
SEARCH: [term1, term2, term3]`}]
        })
      });
      if(!resp.ok) throw new Error(resp.status);
      const data = await resp.json();
      const text = data.content?.[0]?.text || "";
      setAiImageUrl(text || l1Guide || `A clear photo of "${word.word}" on a plain background.`);
    } catch(e){
      setAiImageUrl(l1Guide || `A clear, realistic classroom photo showing "${word.display||word.word}" as a single subject on a plain white background.`);
    }
    setGenerating(false);
  };

  const handleCustomPhoto = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target.result;
      // Replace immediately
      setCustomPhoto(url);
      setUnsplashUrl(null);
      mem.set(`word_photo_${word.id||word.word}_${user?.id}`, url);
      mem.set(`word_img_${(word.word||word.id||'').toLowerCase()}`, null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };


  const l4Colors  = ["#1B65B8","#5AAB2A","#E67E22","#8E44AD","#E74C3C","#000000"];
  const l4Fonts   = [
    {label:"Fredoka",  val:"'Fredoka One',cursive"},
    {label:"Nunito",   val:"'Nunito',sans-serif"},
    {label:"Arial",    val:"Arial,sans-serif"},
    {label:"Georgia",  val:"Georgia,serif"},
    {label:"Courier",  val:"Courier,monospace"},
    {label:"Impact",   val:"Impact,sans-serif"},
  ];

  const levels = [
    {num:1, label:"Photo",     emoji:"📷", color:"#5AAB2A"},
    {num:2, label:"Color Art", emoji:"🎨", color:"#1B65B8"},
    {num:3, label:"B&W",       emoji:"✏️",  color:"#607D8B"},
    {num:4, label:"Text",      emoji:"🔤", color:"#E67E22"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",
        maxWidth:560,maxHeight:"88vh",display:"flex",flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.25)"}}>

        {/* Header */}
        <div style={{padding:"18px 20px 0",display:"flex",gap:14,alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:52,lineHeight:1}}>{word.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#1B65B8"}}>
              {word.display||word.word}
            </div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#AAA",marginTop:2,
              textTransform:"capitalize"}}>
              {word.cat} · {word.age?`Ages ${word.age}`:"All ages"}
            </div>
          </div>
          <button onClick={onClose} style={{background:"#F0F2F5",border:"none",
            borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:18,flexShrink:0}}>✕</button>
        </div>

        {/* Level tabs */}
        <div style={{display:"flex",margin:"14px 20px 0",borderRadius:12,
          overflow:"hidden",border:"1px solid #EEF0F4",flexShrink:0}}>
          {levels.map(l=>(
            <button key={l.num} onClick={()=>setActiveLevel(l.num)}
              style={{flex:1,padding:"10px 4px",border:"none",cursor:"pointer",
              background:activeLevel===l.num?l.color:"#F8F9FC",
              color:activeLevel===l.num?"#fff":"#888",
              fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,
              borderRight:"1px solid #EEF0F4",transition:"all 0.15s"}}>
              <div style={{fontSize:15,marginBottom:2}}>{l.emoji}</div>
              {l.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px 24px"}}>

          {/* ── LEVEL 1: Realistic Photo ── */}
          {activeLevel===1&&(
            <div>
              {/* Current image display */}
              {/* Level 1 — Real image display */}
              <div style={{borderRadius:14,marginBottom:14,overflow:"hidden",
                background:"#F0F2F5",minHeight:200,position:"relative",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {customPhoto?(
                  <>
                    <img src={customPhoto} alt={word.word}
                      style={{width:"100%",maxHeight:260,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",bottom:8,left:8,
                      background:"rgba(90,171,42,0.9)",borderRadius:8,
                      padding:"3px 10px",fontFamily:"'Nunito',sans-serif",
                      fontSize:11,color:"#fff",fontWeight:700}}>
                      ✅ Your photo
                    </div>
                  </>
                ):unsplashUrl?(
                  <>
                    <img src={unsplashUrl} alt={word.word}
                      style={{width:"100%",maxHeight:260,objectFit:"cover",display:"block"}}
                      onError={()=>setUnsplashUrl(null)}/>
                    <div style={{position:"absolute",bottom:8,left:8,
                      background:"rgba(0,0,0,0.55)",borderRadius:8,
                      padding:"3px 10px",fontFamily:"'Nunito',sans-serif",
                      fontSize:11,color:"#fff",fontWeight:700}}>
                      📷 Auto image · tap to replace
                    </div>
                  </>
                ):imgLoading?(
                  <div style={{textAlign:"center",padding:20}}>
                    <div style={{fontSize:32,marginBottom:8}}>🔍</div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#888"}}>
                      Finding image for "{word.display||word.word}"...
                    </div>
                  </div>
                ):(
                  <div style={{textAlign:"center",padding:20}}>
                    <div style={{fontSize:48,marginBottom:8}}>{word.emoji}</div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888"}}>
                      No image found — tap "Use My Photo" to add one
                    </div>
                  </div>
                )}
              </div>
              {/* AI guide text (collapsed by default) */}
              {aiImageUrl&&!customPhoto&&!unsplashUrl&&(
                <div style={{background:"#EEF5FF",borderRadius:10,padding:12,
                  marginBottom:12,fontFamily:"'Nunito',sans-serif",fontSize:12,
                  color:"#555",lineHeight:1.7}}>{aiImageUrl}</div>
              )}
              {aiError&&<div style={{color:"#E74C3C",fontSize:11,marginBottom:8}}>{aiError}</div>}

              {/* Action buttons */}
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <button onClick={()=>{
                    setUnsplashUrl(null);
                    mem.set(`word_img_${(word.word||word.id||'').toLowerCase()}`,null);
                    fetchWordImage(true);
                  }}
                  disabled={imgLoading}
                  style={{flex:1,padding:"10px",borderRadius:10,border:"none",
                  background:imgLoading?"#EEF0F4":"#1B65B8",
                  color:imgLoading?"#AAA":"#fff",fontFamily:"'Nunito',sans-serif",
                  fontWeight:800,fontSize:11,cursor:imgLoading?"not-allowed":"pointer"}}>
                  {imgLoading?"🔍 Finding...":"🔍 Find New Image"}
                </button>
                <button onClick={()=>cameraRef.current?.click()}
                  style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid #5AAB2A",
                  background:"transparent",color:"#5AAB2A",fontFamily:"'Nunito',sans-serif",
                  fontWeight:800,fontSize:11,cursor:"pointer"}}>
                  📷 Use My Photo
                </button>
              </div>
              {(customPhoto||unsplashUrl)&&(
                <button onClick={()=>{
                    setCustomPhoto(null);
                    setUnsplashUrl(null);
                    mem.set(`word_photo_${word.id||word.word}_${user?.id}`,null);
                    mem.set(`word_img_${(word.word||word.id||'').toLowerCase()}`,null);
                  }}
                  style={{width:"100%",padding:"8px",borderRadius:8,border:"1px solid #EEF0F4",
                  background:"transparent",color:"#AAA",fontFamily:"'Nunito',sans-serif",
                  fontSize:11,cursor:"pointer",marginBottom:6}}>
                  ✕ Remove image
                </button>
              )}
              {/* Camera input - opens camera directly on mobile */}
              <input ref={cameraRef} type="file" accept="image/*"
                capture="environment"
                style={{display:"none"}} onChange={handleCustomPhoto}/>
              {/* File input - for desktop or manual file selection */}
              <input ref={cameraRef} type="file" accept="image/*"
                capture="environment"
                style={{display:"none"}} onChange={handleCustomPhoto}/>

              <div style={{padding:"10px 12px",background:"#EAF3DE",borderRadius:10,
                fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#3D8A1A",lineHeight:1.6}}>
                💡 Use the AI guide to find a royalty-free photo on Unsplash.com, or tap "Use My Photo" to take a real classroom photo for maximum learning impact.
              </div>
            </div>
          )}

          {/* ── LEVEL 2: Color Art/Emoji ── */}
          {activeLevel===2&&(
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555",
                marginBottom:12,lineHeight:1.6}}>
                Select the color clipart that best represents <b>{word.display||word.word}</b> for your student. Level 3 will automatically mirror this in black & white.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                {l2Alts.map((e,i)=>(
                  <button key={i} onClick={()=>setSelectedL2(i)}
                    style={{padding:"18px 8px",borderRadius:14,border:"none",
                    background:selectedL2===i?"#EEF5FF":"#F8F9FC",
                    boxShadow:selectedL2===i?"0 0 0 2px #1B65B8":"0 1px 4px rgba(0,0,0,0.08)",
                    textAlign:"center",cursor:"pointer",transition:"all 0.15s",
                    position:"relative"}}>
                    {selectedL2===i&&(
                      <div style={{position:"absolute",top:6,right:6,width:16,height:16,
                        borderRadius:"50%",background:"#1B65B8",color:"#fff",
                        fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",
                        fontWeight:900}}>✓</div>
                    )}
                    <div style={{fontSize:40,marginBottom:4}}>{e}</div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:9,
                      color:selectedL2===i?"#1B65B8":"#AAA",fontWeight:700}}>
                      {i===0?"⭐ Primary":"Alt "+i}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{padding:"12px 14px",borderRadius:10,
                background:selectedL2>0?"#EEF5FF":"#F8F9FC",
                fontFamily:"'Nunito',sans-serif",fontSize:12,
                color:selectedL2>0?"#1B65B8":"#888",lineHeight:1.6}}>
                {selectedL2>0
                  ? `✅ "${l2Alts[selectedL2]}" selected — Level 3 will show this in black & white`
                  : `💡 Select an alternative if the primary icon doesn't match your student's environment`
                }
              </div>
            </div>
          )}

          {/* ── LEVEL 3: B&W version of selected L2 ── */}
          {activeLevel===3&&(
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555",
                marginBottom:12,lineHeight:1.6}}>
                Level 3 automatically mirrors your selected Level 2 image in black & white. Color is removed to reduce visual prompting.
              </div>

              {/* Show the SAME emoji as L2 but in grayscale */}
              <div style={{background:"#F8F9FC",borderRadius:14,padding:24,
                textAlign:"center",marginBottom:14,
                border:"2px solid #EEF0F4"}}>
                <div style={{fontSize:72,filter:"grayscale(100%) contrast(1.2)",
                  marginBottom:8,lineHeight:1}}>{currentL2Emoji}</div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",fontWeight:700}}>
                  B&W version of your Level 2 selection
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#AAA",marginTop:4}}>
                  {selectedL2===0?"Primary icon":"Alternative "+selectedL2} — grayscale applied
                </div>
              </div>

              <div style={{padding:"10px 14px",background:"#F0F0F0",borderRadius:10,
                fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#607D8B",lineHeight:1.6}}>
                💡 Level 3 always mirrors Level 2 in black & white. To change the Level 3 image, go back to Level 2 and select a different alternative.
              </div>

              <div style={{marginTop:10,padding:"10px 14px",background:"#EEF5FF",
                borderRadius:10,fontFamily:"'Nunito',sans-serif",fontSize:12,
                color:"#1B65B8",lineHeight:1.6}}>
                🎯 <b>Why B&W?</b> Removing color as a visual cue increases cognitive demand, preparing the student for symbol-only and text-only recognition (Level 4).
              </div>
            </div>
          )}

          {/* ── LEVEL 4: Text only with color/font options ── */}
          {activeLevel===4&&(
            <div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555",
                marginBottom:14,lineHeight:1.6}}>
                Level 4 displays text only. Customize the color and font style for your student.
              </div>

              {/* Live preview */}
              <div style={{background:"#F8F9FC",borderRadius:14,padding:24,
                textAlign:"center",marginBottom:16,minHeight:100,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontFamily:l4Font,fontSize:"clamp(32px,10vw,56px)",
                  color:l4Color,letterSpacing:2,lineHeight:1,fontWeight:"bold"}}>
                  {word.display||word.word?.toUpperCase()}
                </div>
              </div>

              {/* Color options */}
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,
                color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                Text Color
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {l4Colors.map(c=>(
                  <button key={c} onClick={()=>setL4Color(c)}
                    style={{width:36,height:36,borderRadius:"50%",border:"none",
                    background:c,cursor:"pointer",
                    boxShadow:l4Color===c?"0 0 0 3px #fff, 0 0 0 5px "+c:"0 2px 6px rgba(0,0,0,0.2)",
                    transition:"all 0.15s"}}/>
                ))}
              </div>

              {/* Font options */}
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,
                color:"#888",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                Font Style
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                {l4Fonts.map(f=>(
                  <button key={f.val} onClick={()=>setL4Font(f.val)}
                    style={{padding:"10px 6px",borderRadius:10,border:"none",
                    background:l4Font===f.val?"#EEF5FF":"#F8F9FC",
                    boxShadow:l4Font===f.val?"0 0 0 2px #1B65B8":"0 1px 4px rgba(0,0,0,0.08)",
                    cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontFamily:f.val,fontSize:16,color:l4Color,fontWeight:"bold",
                      marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {word.display||word.word}
                    </div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:9,color:"#AAA",fontWeight:700}}>
                      {f.label}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{padding:"10px 14px",background:"#FFF8EC",borderRadius:10,
                fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#92600A",lineHeight:1.6}}>
                🎓 Level 4 represents full symbolic independence — the student reads and responds to the written word without any visual support.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Add Word In See Modal ─────────────────────────────────────────
function AddWordInSeeModal({user, onClose, onAdd}){
  const [word,setWord]   = useState("");
  const [display,setDisplay] = useState("");
  const [emoji,setEmoji] = useState("");
  const [cat,setCat]     = useState("core");
  const [age,setAge]     = useState("all");
  const [triggers,setTriggers] = useState("");
  const [saving,setSaving] = useState(false);

  const handleSave = async () => {
    if(!word.trim()||!emoji.trim()) return;
    setSaving(true);
    const newWord = {
      id:`custom_${Date.now()}`,
      word:word.trim(),
      display:(display||word).toUpperCase(),
      emoji:emoji.trim(),
      cat,
      age:age==="all"?undefined:age,
      triggers: triggers ? triggers.split(",").map(t=>t.trim()) : [word.trim()],
      color:"#1B65B8",
    };
    try {
      await sbAuth.saveCustomWord(newWord, user.id, user.district_id||null);
    } catch(e){}
    onAdd(newWord);
    onClose();
    setSaving(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:16}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:440,
        padding:24,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#5AAB2A",marginBottom:4}}>
          ➕ Add Word
        </div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginBottom:16}}>
          New words are saved to your account and available immediately.
        </div>

        {[
          {label:"Word (what you say) *", val:word, set:setWord, placeholder:"e.g. sit down"},
          {label:"Display text (what student sees)", val:display, set:setDisplay, placeholder:"e.g. SIT DOWN"},
          {label:"Emoji icon *", val:emoji, set:setEmoji, placeholder:"e.g. 🪑"},
          {label:"Voice triggers (comma separated)", val:triggers, set:setTriggers, placeholder:"e.g. sit down, take a seat"},
        ].map(f=>(
          <div key={f.label} style={{marginBottom:12}}>
            <label style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
              color:"#888",display:"block",marginBottom:4}}>{f.label}</label>
            <input value={f.val} onChange={e=>f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,
              border:"2px solid #EEF0F4",fontFamily:"'Nunito',sans-serif",
              fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}

        {/* Category */}
        <div style={{marginBottom:12}}>
          <label style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
            color:"#888",display:"block",marginBottom:4}}>Category</label>
          <select value={cat} onChange={e=>setCat(e.target.value)}
            style={{width:"100%",padding:"10px 12px",borderRadius:10,
            border:"2px solid #EEF0F4",fontFamily:"'Nunito',sans-serif",fontSize:13}}>
            {CATS.map(c=>(
              <option key={c.id} value={c.id} style={{textTransform:"capitalize"}}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Developmental age */}
        <div style={{marginBottom:16}}>
          <label style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
            color:"#888",display:"block",marginBottom:4}}>Developmental Age Band</label>
          <select value={age} onChange={e=>setAge(e.target.value)}
            style={{width:"100%",padding:"10px 12px",borderRadius:10,
            border:"2px solid #EEF0F4",fontFamily:"'Nunito',sans-serif",fontSize:13}}>
            <option value="all">All Ages</option>
            {DEV_AGES.map(a=>(
              <option key={a.id} value={a.id}>{a.label} — {a.desc}</option>
            ))}
          </select>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose}
            style={{flex:1,padding:"11px",borderRadius:10,border:"2px solid #EEF0F4",
            background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,
            fontSize:13,cursor:"pointer",color:"#888"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving||!word||!emoji}
            style={{flex:2,padding:"11px",borderRadius:10,border:"none",
            background:!word||!emoji?"#EEF0F4":"#5AAB2A",
            color:!word||!emoji?"#AAA":"#fff",
            fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,
            cursor:!word||!emoji?"not-allowed":"pointer"}}>
            {saving?"Saving...":"Save Word"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Terms & Conditions Modal ─────────────────────────────────────
function TermsModal({onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:99999,padding:16}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:600,
        maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#1B65B8",padding:"16px 20px",display:"flex",
          alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff"}}>
            SaySee™ Terms & Conditions
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",
            border:"none",borderRadius:8,padding:"4px 12px",color:"#fff",
            cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:20,flex:1,
          fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#555",lineHeight:1.8,
          userSelect:"none",WebkitUserSelect:"none"}}
          onContextMenu={e=>e.preventDefault()}>

          <p style={{color:"#888",fontSize:11,marginBottom:16}}>
            Effective Date: June 2026 · SaySee LLC · U.S. Patent Pending App. No. 64/086,776 · SaySee™ is a registered trademark.
          </p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>1. Acceptance of Terms</h3>
          <p>By accessing or using the SaySee™ AAC Visual Learning Platform ("Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms constitute a legally binding agreement between you and SaySee LLC.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>2. Description of Service</h3>
          <p>SaySee™ is a voice-activated Augmentative and Alternative Communication (AAC) visual learning platform designed for use by licensed educators, speech-language pathologists, applied behavior analysts, and other qualified professionals. The Service is intended for use with students with communication disabilities and English language learners in educational and clinical settings.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>3. Eligibility and Account Registration</h3>
          <p>You must be at least 18 years of age and a qualified educator or professional to register for an account. By registering, you represent that all information provided is accurate and that you are authorized to use student data in accordance with applicable law including FERPA.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>4. Subscription and Payment</h3>
          <p>Access to SaySee™ requires a paid subscription following a 7-day free trial. Subscription fees are charged in advance on a monthly or annual basis. All fees are non-refundable except as required by law. SaySee LLC reserves the right to modify pricing with 30 days notice. Cancellation requests must be submitted to hello@saysee.io.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>5. Student Data and FERPA</h3>
          <p>You acknowledge that you are responsible for ensuring appropriate consent and authorization for any student data entered into the Service. SaySee LLC operates as a "school official" under FERPA when used by educational institutions. Student data will not be sold, shared with third parties, or used for advertising. Full Data Processing Agreement terms are available upon request at hello@saysee.io.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>6. Intellectual Property</h3>
          <p>The SaySee™ platform, including all software, visual design, methodology, word libraries, AI scaffolding system, and documentation, is the exclusive intellectual property of SaySee LLC. SaySee™ is a registered trademark of SaySee LLC. U.S. Patent Pending Application No. 64/086,776. All content is protected by copyright © 2026 SaySee LLC. Unauthorized reproduction, distribution, or modification is strictly prohibited.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>7. Acceptable Use</h3>
          <p>You agree to use the Service only for lawful educational purposes. You may not: share account credentials, reverse engineer the software, use the Service for any commercial purpose other than as permitted under your subscription, upload inappropriate content, or attempt to circumvent security measures.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>8. AI and Voice Processing</h3>
          <p>The Service uses artificial intelligence for semantic word matching. Voice audio is processed in real-time and is not stored or recorded. Student names are removed from all AI processing to protect student privacy. By using the Service, you consent to this processing on behalf of your institution.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>9. Disclaimer of Warranties</h3>
          <p>The Service is provided "as is" without warranty of any kind. SaySee LLC does not warrant that the Service will be uninterrupted, error-free, or that results obtained will be accurate. SaySee LLC disclaims all warranties, express or implied, including warranties of merchantability and fitness for a particular purpose.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>10. Limitation of Liability</h3>
          <p>SaySee LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the subscription fees paid by you in the 12 months preceding any claim.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>11. Termination</h3>
          <p>SaySee LLC reserves the right to suspend or terminate accounts that violate these Terms. Upon termination, your access to the Service will cease and your data will be deleted within 30 days.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>12. Governing Law</h3>
          <p>These Terms are governed by the laws of the State of California. Any disputes shall be resolved in San Francisco County, California through binding arbitration.</p>

          <h3 style={{fontFamily:"'Fredoka One',cursive",color:"#1B65B8",fontSize:16,margin:"16px 0 6px"}}>13. Contact</h3>
          <p>SaySee LLC · 28 Geary St Suite 650 PMB 70334 · San Francisco, CA 94108 · hello@saysee.io</p>

          <p style={{marginTop:20,fontSize:11,color:"#CCC"}}>
            © 2026 SaySee LLC. All rights reserved. SaySee™ is a registered trademark. Patent Pending — U.S. Application No. 64/086,776. These Terms may not be reproduced without written permission from SaySee LLC.
          </p>
        </div>
        <div style={{padding:16,borderTop:"1px solid #EEF0F4",textAlign:"center"}}>
          <button onClick={onClose}
            style={{padding:"10px 32px",borderRadius:30,border:"none",
            background:"#1B65B8",color:"#fff",fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:14,cursor:"pointer"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Auth screen ───────────────────────────────────────────────
function AuthScreen({accounts,onLogin,onRegister,termsAccepted=false,onShowTerms,onAcceptTerms}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [plan,setPlan]=useState("monthly");
  const [err,setErr]=useState("");
  const [localTerms,setLocalTerms]=useState(()=>{
    try{ return localStorage.getItem("saysee_terms_accepted")==="true"; }catch(e){ return false; }
  });
  const [showStripe,setShowStripe]=useState(false);
  const [stripePlan,setStripePlan]=useState("monthly");

  const iStyle={width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.92)",color:"#1A1A2E",fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"};
  const lStyle={fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block",fontFamily:"'Nunito',sans-serif"};

  const doLogin=async()=>{
    setErr("");
    await onLogin(email, pass, setErr);
  };
  const doNext=()=>{
    setErr("");
    if(!name||!email||!pass){setErr("All fields required.");return;}
    if(pass.length<6){setErr("Password needs 6+ characters.");return;}
    setMode("plan");
  };
  const doCreate=async()=>{
    setErr("");
    await onRegister(name, email, pass, plan, setErr);
  };

  const plans=[
    {id:"monthly",label:"Monthly",   price:"$28/mo",  sub:"Up to 28 students · Cancel anytime",color:"#1B65B8"},
    {id:"annual", label:"Annual",    price:"$252/yr", sub:"Save 25% · Up to 28 students",       color:"#8E44AD",badge:"BEST VALUE"},
    {id:"school", label:"School Site",price:"Custom", sub:"Multiple classrooms · Contact us",   color:"#5AAB2A"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1B4F9E,#2B6CB0,#1A65B8)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 20px",overflowY:"auto"}}>
      <div style={{width:"min(94vw,440px)",paddingTop:"max(20px, 4vh)"}}>
        <div style={{textAlign:"center",marginBottom:28,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <SaySeeFullLogo size={140}/>
        </div>
        <div style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(20px)",borderRadius:24,padding:28,border:"1px solid rgba(255,255,255,0.12)"}}>

          {mode==="login"&&<>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:23,color:"#fff",marginBottom:22}}>Welcome back</div>
            <form onSubmit={e=>{e.preventDefault();doLogin();}} style={{width:"100%"}}>
              <div style={{marginBottom:13}}>
                <label style={lStyle}>Email</label>
                <input
                  value={email} onChange={e=>setEmail(e.target.value)}
                  type="email" placeholder="you@school.edu"
                  autoComplete="email"
                  style={iStyle}/>
              </div>
              <div style={{marginBottom:13}}>
                <label style={lStyle}>Password</label>
                <input
                  value={pass} onChange={e=>setPass(e.target.value)}
                  type="password" placeholder="••••••••"
                  autoComplete="current-password"
                  style={iStyle}/>
              </div>
              <button type="submit" style={{display:"none"}}>Sign In</button>
            </form>
            {err&&<div style={{color:"#FF7675",fontSize:13,marginBottom:10,fontFamily:"'Nunito',sans-serif"}}>{err}</div>}
            {(!termsAccepted && !localTerms)&&(
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}
                onClick={()=>{
                  if(!localTerms){
                    setLocalTerms(true);
                    if(onAcceptTerms) onAcceptTerms();
                    try{localStorage.setItem("saysee_terms_accepted","true");}catch(ex){}
                  } else {
                    setLocalTerms(false);
                    try{localStorage.removeItem("saysee_terms_accepted");}catch(ex){}
                  }
                }}>
                <input type="checkbox" id="tc-check" checked={localTerms}
                  onChange={()=>{}}
                  style={{width:16,height:16,cursor:"pointer",flexShrink:0,
                    accentColor:"#5AAB2A"}}/>
                <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,
                  color:"#fff",lineHeight:1.5,cursor:"pointer",
                  fontWeight:600,userSelect:"none"}}>
                  I agree to the{" "}
                  <span onClick={(e)=>{e.stopPropagation();onShowTerms&&onShowTerms();}}
                    style={{color:"#5AAB2A",fontWeight:800,cursor:"pointer",
                    textDecoration:"underline"}}>
                    Terms & Conditions
                  </span>
                  {" "}and Privacy Policy
                </span>
              </div>
            )}
            <button onClick={()=>{ if(!localTerms && !termsAccepted){ alert("Please check the Terms & Conditions box to continue."); return; } doLogin(); }} type="button" style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#0984E3,#6C5CE7)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",boxShadow:"0 6px 24px rgba(9,132,227,0.45)",marginBottom:14}}>Sign In</button>
            <div style={{textAlign:"center",fontFamily:"'Nunito',sans-serif",fontSize:14,color:"rgba(255,255,255,0.45)"}}>
              No account? <span onClick={()=>{setErr("");setMode("register");}} style={{color:"#74B9FF",cursor:"pointer",fontWeight:800}}>Sign up</span>
            </div>
          </>}

          {mode==="register"&&<>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:23,color:"#fff",marginBottom:22}}>Create account</div>

            {[["Name","text",name,setName,"Your full name"],["Email","email",email,setEmail,"you@school.edu"],["Password","password",pass,setPass,"6+ characters"]].map(([l,t,v,s,p])=>(
              <div key={l} style={{marginBottom:13}}><label style={lStyle}>{l}</label><input value={v} onChange={e=>s(e.target.value)} type={t} placeholder={p} style={iStyle}/></div>
            ))}
            {err&&<div style={{color:"#FF7675",fontSize:13,marginBottom:10,fontFamily:"'Nunito',sans-serif"}}>{err}</div>}
            <button onClick={doNext} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00B894,#0984E3)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",boxShadow:"0 6px 24px rgba(0,184,148,0.4)",marginBottom:14}}>Continue to Plan</button>
            <div style={{textAlign:"center",fontFamily:"'Nunito',sans-serif",fontSize:14,color:"rgba(255,255,255,0.45)"}}>
              Have an account? <span onClick={()=>{setErr("");setMode("login");}} style={{color:"#74B9FF",cursor:"pointer",fontWeight:800}}>Sign in</span>
            </div>
          </>}

          {showStripe&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
              <PaymentForm
                user={{id:`temp_${Date.now()}`,email,name,role:"teacher",plan:stripePlan,maxStudents:28}}
                plan={stripePlan}
                onSuccess={async (paidPlan)=>{
                  setShowStripe(false);
                  // Register account with paid plan
                  await onRegister(name,email,pass,paidPlan||stripePlan,setErr);
                }}
                onCancel={()=>setShowStripe(false)}
              />
            </div>
          )}

          {mode==="plan"&&<>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#fff",marginBottom:5}}>Choose your plan</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:20}}>Start free for 7 days — or pay now and skip the trial.</div>
            {plans.map(p=>(
              <div key={p.id} style={{padding:"14px 16px",borderRadius:14,marginBottom:10,background:plan===p.id?`${p.color}22`:"rgba(255,255,255,0.04)",border:`2px solid ${plan===p.id?p.color:"rgba(255,255,255,0.1)"}`,transition:"all 0.2s",position:"relative"}}>
                {p.badge&&<div style={{position:"absolute",top:-8,right:10,background:p.color,color:"#fff",fontSize:9,fontWeight:900,padding:"2px 8px",borderRadius:20,fontFamily:"'Nunito',sans-serif",letterSpacing:1}}>{p.badge}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#fff"}}>{p.label}</div>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:p.color}}>{p.price}</div>
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{p.sub}</div>
                {/* Free Trial + Pay Now buttons per card */}
                {p.id==="school"?(
                  <a href="mailto:hello@saysee.io?subject=School Site License Inquiry"
                    style={{display:"block",textAlign:"center",padding:"9px",borderRadius:10,
                    background:p.color,color:"#fff",fontFamily:"'Nunito',sans-serif",
                    fontWeight:800,fontSize:13,textDecoration:"none",marginTop:10}}>
                    ✉️ Contact Us
                  </a>
                ):(
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    <button onClick={()=>{setPlan(p.id);doCreate();}}
                      style={{flex:1,padding:"9px",borderRadius:10,
                      border:`2px solid ${p.color}`,background:"transparent",
                      color:p.color,fontFamily:"'Nunito',sans-serif",
                      fontWeight:800,fontSize:12,cursor:"pointer"}}>
                      🎁 Free Trial
                    </button>
                    <button onClick={()=>{setPlan(p.id);setStripePlan(p.id);setShowStripe(true);}}
                      style={{flex:1,padding:"9px",borderRadius:10,border:"none",
                      background:p.color,color:"#fff",fontFamily:"'Nunito',sans-serif",
                      fontWeight:800,fontSize:12,cursor:"pointer"}}>
                      💳 Pay Now
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Subscriber Manager (Admin only) ──────────────────────────────
function SubscriberManager(){
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    loadSubscribers();
  },[]);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("accounts")
        .select("id, email, name, role, plan, stripe_customer_id, stripe_subscription_id, created_at")
        .order("created_at", { ascending: false });
      setSubscribers(data || []);
    } catch(e){
      console.log("Error loading subscribers:", e);
    }
    setLoading(false);
  };

  const cancelSubscription = async (sub) => {
    if(!window.confirm(`Cancel subscription for ${sub.email}? This will stop future charges immediately.`)) return;
    setCancelling(sub.id);
    try {
      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sub.email, subscriptionId: sub.stripe_subscription_id }),
      });
      const data = await res.json();
      if(data.success){
        setMsg(`✅ Subscription cancelled for ${sub.email}`);
        loadSubscribers();
      } else {
        setMsg(`❌ Error: ${data.error}`);
      }
    } catch(e){
      setMsg("❌ Failed to cancel. Try again.");
    }
    setCancelling(null);
    setTimeout(()=>setMsg(""), 5000);
  };

  const updatePlan = async (sub, newPlan) => {
    try {
      await supabase.from("accounts").update({ plan: newPlan }).eq("id", sub.id);
      setMsg(`✅ Plan updated to ${newPlan} for ${sub.email}`);
      loadSubscribers();
      setTimeout(()=>setMsg(""), 4000);
    } catch(e){
      setMsg("❌ Failed to update plan.");
    }
  };

  const planColor = (plan) => {
    if(plan==="monthly"||plan==="annual"||plan==="school") return "#5AAB2A";
    if(plan==="admin") return "#1B65B8";
    return "#E67E22";
  };

  const filtered = subscribers.filter(s=>
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const paid = subscribers.filter(s=>s.plan==="monthly"||s.plan==="annual"||s.plan==="school");
  const trial = subscribers.filter(s=>s.plan==="trial"||!s.plan);
  const mrr = paid.filter(s=>s.plan==="monthly").length * 28 +
              paid.filter(s=>s.plan==="annual").length * 21 +
              paid.filter(s=>s.plan==="school").length * 0;

  return(
    <div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          ["Total Accounts", subscribers.length, "#1B65B8"],
          ["Active Plans", paid.length, "#5AAB2A"],
          ["Trial Users", trial.length, "#E67E22"],
          ["Est. MRR", `$${mrr}`, "#8E44AD"],
        ].map(([label,val,color])=>(
          <div key={label} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:14,textAlign:"center"}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color}}>{val}</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888",marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Message */}
      {msg&&<div style={{padding:"10px 14px",borderRadius:10,background:msg.startsWith("✅")?"#EAF3DE":"#FFF0F0",
        fontFamily:"'Nunito',sans-serif",fontSize:13,color:msg.startsWith("✅")?"#3D8A1A":"#E74C3C",
        marginBottom:14,fontWeight:700}}>{msg}</div>}

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search by name or email..."
        style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",
        background:"rgba(255,255,255,0.06)",color:"#fff",fontFamily:"'Nunito',sans-serif",
        fontSize:13,marginBottom:14,boxSizing:"border-box",outline:"none"}}/>

      {/* Subscriber list */}
      {loading?(
        <div style={{textAlign:"center",padding:40,color:"#888"}}>Loading...</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(sub=>(
            <div key={sub.id} style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:16,
              border:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#fff"}}>
                    {sub.name||"No name"}
                  </div>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:2}}>
                    {sub.email}
                  </div>
                  <div style={{marginTop:6,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:800,
                      fontFamily:"'Nunito',sans-serif",
                      background:`${planColor(sub.plan)}22`,color:planColor(sub.plan),
                      border:`1px solid ${planColor(sub.plan)}44`}}>
                      {sub.plan||"trial"}
                    </span>
                    <span style={{fontSize:11,color:"#555",fontFamily:"'Nunito',sans-serif"}}>
                      {sub.role}
                    </span>
                    {sub.stripe_subscription_id&&(
                      <span style={{fontSize:10,color:"#444",fontFamily:"'Nunito',sans-serif"}}>
                        · Stripe active
                      </span>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {/* Plan override dropdown */}
                  <select onChange={e=>{ if(e.target.value) updatePlan(sub, e.target.value); e.target.value=""; }}
                    style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.15)",
                    background:"rgba(255,255,255,0.08)",color:"#fff",fontFamily:"'Nunito',sans-serif",
                    fontSize:12,cursor:"pointer"}}>
                    <option value="">Change Plan</option>
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="school">School Site</option>
                    <option value="admin">Admin</option>
                  </select>
                  {/* Cancel button - only show if has Stripe subscription */}
                  {sub.stripe_subscription_id&&(
                    <button onClick={()=>cancelSubscription(sub)}
                      disabled={cancelling===sub.id}
                      style={{padding:"6px 14px",borderRadius:8,border:"1px solid #E74C3C",
                      background:"transparent",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",
                      fontWeight:800,fontSize:12,cursor:"pointer",opacity:cancelling===sub.id?0.5:1}}>
                      {cancelling===sub.id?"Cancelling...":"Cancel Sub"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:30,color:"#555",fontFamily:"'Nunito',sans-serif"}}>
              No accounts found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin panel ───────────────────────────────────────────────
// ── Bulk admin-default image importer (admin only) ───────────────
// Filenames: "word__description__category.ext". Each file either matches an
// existing word (sets its admin-default image) or creates a new word. Images are
// resized + flattened to white and stored as owner_id=null rows at defaults/{wordId}.
function resizeForDefault(dataUrl){
  return new Promise(resolve=>{
    try{
      const img=new Image();
      img.onload=()=>{
        try{
          const maxShort=1080, maxLong=1600;
          const short=Math.min(img.width,img.height), long=Math.max(img.width,img.height);
          const scale=Math.min(1, maxShort/short, maxLong/long); // never upscale
          const cw=Math.max(1,Math.round(img.width*scale)), ch=Math.max(1,Math.round(img.height*scale));
          const canvas=document.createElement("canvas");
          canvas.width=cw; canvas.height=ch;
          const ctx=canvas.getContext("2d");
          ctx.fillStyle="#fff"; ctx.fillRect(0,0,cw,ch); // flatten transparency to white
          ctx.drawImage(img,0,0,cw,ch);
          resolve(canvas.toDataURL("image/jpeg",0.85));
        }catch(e){ resolve(dataUrl); }
      };
      img.onerror=()=>resolve(dataUrl);
      img.src=dataUrl;
    }catch(e){ resolve(dataUrl); }
  });
}

function parseDefaultFilename(filename){
  const base=filename.replace(/\.[^.]+$/,"");          // strip extension
  const parts=base.split(/_+/).map(s=>s.trim()).filter(Boolean);
  return { word:parts[0]||"", desc:parts[1]||"", cat:parts[2]||"" };
}

function BulkDefaultImporter({words, setWords}){
  const fileRef=useRef(null);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState({done:0,total:0});
  const [report,setReport]=useState(null);
  const validCatIds=CATS.map(c=>c.id);

  const run=async(fileList)=>{
    const files=Array.from(fileList||[]);
    if(!files.length) return;
    if(!supabase){ setReport({matched:0,created:0,errors:[{file:"—",reason:"No database connection"}]}); return; }

    setBusy(true); setReport(null); setProgress({done:0,total:files.length});

    const errors=[], newWords=[], descFills={};
    let matched=0, created=0, createdCount=0;
    const baseId=Date.now();
    const lookup=[...words];   // grows as we create, so dupes in one batch match instead of re-create

    for(let i=0;i<files.length;i++){
      const file=files[i];
      try{
        const {word,desc,cat}=parseDefaultFilename(file.name);
        if(!word){ errors.push({file:file.name,reason:"No word before the first __"}); setProgress({done:i+1,total:files.length}); continue; }
        const key=word.toLowerCase();
        const hit=lookup.find(w=>(w.word||"").toLowerCase().trim()===key || (w.display||"").toLowerCase().trim()===key);

        let wid;
        if(hit){
          wid=hit.id; matched++;
          if(desc && !(hit.photo||"").trim()) descFills[hit.id]=desc;   // fill-if-empty
        }else{
          wid=baseId+createdCount; createdCount++;
          const catId=validCatIds.includes(cat.toLowerCase())?cat.toLowerCase():"custom";
          const color=(CATS.find(c=>c.id===catId)||{}).color||"#6C5CE7";
          const w={id:wid, cat:catId, word:key, display:word.toUpperCase(), emoji:"🆕", photo:desc||"", color, triggers:[key]};
          newWords.push(w); lookup.push(w); created++;
        }

        const dataUrl=await readFileAsDataURL(file);
        const resized=await resizeForDefault(dataUrl);
        const blob=await (await fetch(resized)).blob();
        const path=`defaults/${wid}.jpg`;
        const { error:upErr }=await supabase.storage.from("photos").upload(path, blob, {upsert:true, contentType:"image/jpeg"});
        if(upErr) throw upErr;
        await supabase.from("photos").delete().eq("word_id",String(wid)).is("owner_id",null);
        const { error:rowErr }=await supabase.from("photos").insert({
          word_id:String(wid), owner_id:null, storage_path:path, public_url:path, updated_at:new Date().toISOString()
        });
        if(rowErr) throw rowErr;
      }catch(e){
        errors.push({file:file.name,reason:(e&&e.message)||"Upload failed"});
      }
      setProgress({done:i+1,total:files.length});
    }

    if(newWords.length || Object.keys(descFills).length){
      setWords(prev=>{
        const updated=prev.map(w=>descFills[w.id]?{...w,photo:descFills[w.id]}:w);
        const ids=new Set(updated.map(w=>w.id));
        return [...updated, ...newWords.filter(w=>!ids.has(w.id))];
      });
    }
    setBusy(false);
    setReport({matched,created,errors});
  };

  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple
        style={{display:"none"}} onChange={e=>{ run(e.target.files); e.target.value=""; }}/>
      <button onClick={()=>fileRef.current&&fileRef.current.click()} disabled={busy}
        style={{padding:"9px 18px",borderRadius:10,border:"none",background:busy?"#444":"#6C5CE7",
        color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:busy?"not-allowed":"pointer"}}>
        {busy?`Importing ${progress.done}/${progress.total}…`:"⬆ Bulk import defaults"}
      </button>
      {report&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,10,30,0.7)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setReport(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#1A1C24",color:"#fff",borderRadius:18,
            padding:24,width:"min(92vw,460px)",maxHeight:"80vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)"}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,marginBottom:12}}>Import complete</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,lineHeight:1.8}}>
              ✅ {report.matched} matched and updated<br/>
              🆕 {report.created} new word{report.created===1?"":"s"} created<br/>
              {report.errors.length>0?`⚠️ ${report.errors.length} skipped`:"No errors"}
            </div>
            {report.errors.length>0&&(
              <div style={{marginTop:12,padding:12,background:"rgba(231,76,60,0.12)",borderRadius:10,
                fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#FFB4A8",maxHeight:220,overflowY:"auto"}}>
                {report.errors.map((er,idx)=>(
                  <div key={idx} style={{marginBottom:6}}><b>{er.file}</b> — {er.reason}</div>
                ))}
              </div>
            )}
            {report.created>0&&(
              <div style={{marginTop:12,fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#A29BFE"}}>
                New words default to the My Words category with a 🆕 placeholder emoji — set their category and emoji in the list below.
              </div>
            )}
            <button onClick={()=>setReport(null)} style={{marginTop:16,width:"100%",padding:"11px",
              borderRadius:10,border:"none",background:"#6C5CE7",color:"#fff",fontFamily:"'Nunito',sans-serif",
              fontWeight:800,fontSize:14,cursor:"pointer"}}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Admin per-word level preview + Level 1 photo control ─────────
function AdminWordLevels({wordId, emoji, display, color, initialPhoto, onPhotoChange}){
  const fileRef=useRef(null);
  const [photo,setPhoto]=useState(initialPhoto||null);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{ setPhoto(initialPhoto||null); },[initialPhoto,wordId]);

  const upload=async(file)=>{
    if(!file||!supabase||!wordId) return;
    setBusy(true);
    try{
      const dataUrl=await readFileAsDataURL(file);
      const resized=await resizeForDefault(dataUrl);
      const blob=await (await fetch(resized)).blob();
      const path=`defaults/${wordId}.jpg`;
      const { error:upErr }=await supabase.storage.from("photos").upload(path, blob, {upsert:true, contentType:"image/jpeg"});
      if(upErr) throw upErr;
      await supabase.from("photos").delete().eq("word_id",String(wordId)).is("owner_id",null);
      const { error:rowErr }=await supabase.from("photos").insert({ word_id:String(wordId), owner_id:null, storage_path:path, public_url:path, updated_at:new Date().toISOString() });
      if(rowErr) throw rowErr;
      const { data:su }=await supabase.storage.from("photos").createSignedUrl(path,604800);
      const url=su?.signedUrl||null;
      setPhoto(url);
      if(onPhotoChange) onPhotoChange(url);
    }catch(e){ alert("Upload failed: "+((e&&e.message)||e)); }
    setBusy(false);
  };

  const remove=async()=>{
    if(!supabase||!wordId) return;
    setBusy(true);
    try{
      await supabase.from("photos").delete().eq("word_id",String(wordId)).is("owner_id",null);
      try{ await supabase.storage.from("photos").remove([`defaults/${wordId}.jpg`]); }catch(e){}
      setPhoto(null);
      if(onPhotoChange) onPhotoChange(null);
    }catch(e){ alert("Remove failed: "+((e&&e.message)||e)); }
    setBusy(false);
  };

  const cell={borderRadius:10,overflow:"hidden",height:84,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"};
  const tag={position:"absolute",top:4,left:5,fontSize:9,fontWeight:800,color:"rgba(255,255,255,0.9)",background:"rgba(0,0,0,0.45)",padding:"1px 5px",borderRadius:6,fontFamily:"'Nunito',sans-serif"};
  return(
    <div style={{marginBottom:18}}>
      <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6,fontFamily:"'Nunito',sans-serif"}}>How students see this — all four levels</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
        <div style={{...cell,background:photo?"#000":`${color}14`,border:photo?"none":`2px dashed ${color}66`}}>
          <span style={tag}>L1</span>
          {photo
            ? <img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <span style={{fontSize:30,opacity:0.5}}>{emoji||"🖼️"}</span>}
        </div>
        <div style={{...cell,background:`${color}14`}}>
          <span style={tag}>L2</span>
          <span style={{fontSize:38}}>{emoji}</span>
        </div>
        <div style={{...cell,background:"#F4F5F7"}}>
          <span style={tag}>L3</span>
          <span style={{fontSize:38,filter:"grayscale(100%) contrast(0.55)"}}>{emoji}</span>
        </div>
        <div style={{...cell,background:"#F4F5F7"}}>
          <span style={tag}>L4</span>
          <span style={{fontFamily:"'Fredoka One',cursive",fontSize:15,color:color,textAlign:"center",padding:"0 4px",lineHeight:1.05,wordBreak:"break-word"}}>{display||"—"}</span>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display:"none"}} onChange={e=>{ const fl=e.target.files; upload(fl&&fl[0]); e.target.value=""; }}/>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>{ if(!wordId){ alert("Save the word first, then add its Level 1 photo."); return; } fileRef.current&&fileRef.current.click(); }} disabled={busy}
          style={{padding:"7px 14px",borderRadius:9,border:"none",background:busy?"#444":"#6C5CE7",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:busy?"default":"pointer"}}>
          {busy?"Working…":(photo?"⬆ Replace L1 photo":"⬆ Upload L1 photo")}
        </button>
        {photo&&!busy&&(
          <button onClick={remove} style={{padding:"7px 14px",borderRadius:9,border:"1px solid rgba(231,76,60,0.5)",background:"transparent",color:"#E88",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>Remove</button>
        )}
        <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#777"}}>L2/L3 follow the emoji · L4 is the display text</span>
      </div>
    </div>
  );
}
function AdminPanel({words,setWords,onLogout}){
  const [tab,setTab]=useState("words");
  const [editW,setEditW]=useState(null);
  const [adminCats,setAdminCats]=useState(mem.get("admin_cats",[...CATS]));
  const [showAdminCat,setShowAdminCat]=useState(false);
  const [addW,setAddW]=useState(false);
  const [cat,setCat]=useState("all");
  const [defPhotos,setDefPhotos]=useState({});
  const refreshDefaults=async()=>{
    if(!supabase) return;
    try{
      const { data }=await supabase.from("photos").select("word_id, storage_path, public_url").is("owner_id",null);
      const map={};
      await Promise.all((data||[]).map(async p=>{
        const path=p.storage_path||p.public_url; if(!path) return;
        try{ const { data:su }=await supabase.storage.from("photos").createSignedUrl(path,604800); if(su?.signedUrl) map[String(p.word_id)]=su.signedUrl; }catch(e){}
      }));
      setDefPhotos(map);
    }catch(e){}
  };
  useEffect(()=>{ refreshDefaults(); },[]);

  const shown=cat==="all"?words:words.filter(w=>w.cat===cat);

  return(
    <div style={{minHeight:"100vh",background:"#0F1117",color:"#fff",fontFamily:"'Nunito',sans-serif"}}>
      <header style={{background:"rgba(255,255,255,0.05)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"13px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><SaySeeLogo size={28}/><span style={{fontSize:12,color:"#A29BFE",fontFamily:"'Nunito',sans-serif",fontWeight:700,background:"#A29BFE22",padding:"2px 8px",borderRadius:20}}>ADMIN</span></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["words","categories","subscribers","analytics"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:10,border:"none",background:tab===t?"#6C5CE7":"rgba(255,255,255,0.08)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
          ))}
          <button onClick={onLogout} style={{padding:"6px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"#888",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Logout</button>
        </div>
      </header>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 18px"}}>
        {tab==="words"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24}}>Master Word Library</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginTop:4}}>Base categories and words visible to all teachers on the platform</div>
            
            <BulkDefaultImporter words={words} setWords={setWords}/>
            <button onClick={()=>setAddW(true)} style={{padding:"9px 18px",borderRadius:10,border:"none",background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>+ Add Word</button>
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:18}}>
            {["all",...CATS.map(c=>c.id)].map(id=>(
              <button key={id} onClick={()=>setCat(id)} style={{padding:"5px 12px",borderRadius:30,border:"none",cursor:"pointer",background:cat===id?(CATS.find(c=>c.id===id)?.color||"#6C5CE7"):"rgba(255,255,255,0.08)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,textTransform:"capitalize"}}>{id}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
            {shown.map(w=>(
            <div key={w.id} onClick={()=>setEditW({...w})} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 14px",cursor:"pointer",border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:10,transition:"background 0.15s"}}>
                {defPhotos[String(w.id)]
                  ? <img src={defPhotos[String(w.id)]} alt="" style={{width:38,height:38,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                  : <div style={{width:38,height:38,borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px dashed rgba(255,255,255,0.13)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,opacity:0.4,flexShrink:0}}>📷</div>}
                <span style={{fontSize:24}}>{w.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13}}>{w.display}</div>
                  <div style={{fontSize:11,color:"#666",marginTop:2}}>{w.cat} · {(w.triggers||[]).length} triggers</div>
                </div>
                <div style={{width:9,height:9,borderRadius:"50%",background:w.color,flexShrink:0}}/>
              </div>
            ))}
          </div>
        </>}

        {tab==="categories"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#fff"}}>Base Categories</div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#666",marginTop:4}}>These categories appear for every teacher on the platform</div>
              </div>
              <button onClick={()=>setShowAdminCat(true)} style={{padding:"9px 18px",borderRadius:10,border:"none",background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>+ Add Category</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {adminCats.map(cat=>(
                <div key={cat.id} style={{background:"rgba(255,255,255,0.06)",borderRadius:14,padding:"16px",border:`2px solid ${cat.color}44`,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:40,height:40,borderRadius:10,background:cat.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{cat.icon}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>{cat.label}</div>
                      <div style={{fontSize:11,color:"#666"}}>ID: {cat.id}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <div style={{flex:1,height:4,borderRadius:2,background:cat.color}}/>
                  </div>
                  {cat.id.startsWith("cat_")&&(
                    <button onClick={()=>setAdminCats(p=>p.filter(c=>c.id!==cat.id))} style={{padding:"6px",borderRadius:8,border:"none",background:"rgba(231,76,60,0.2)",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Delete</button>
                  )}
                </div>
              ))}
            </div>
            {showAdminCat&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={()=>setShowAdminCat(false)}>
              <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:28,width:"min(94vw,420px)",maxHeight:"90vh",overflowY:"auto"}}>
                <AddCatModal onAdd={cat=>{const updated=[...adminCats,cat];setAdminCats(updated);mem.set("admin_cats",updated);setShowAdminCat(false);}} onClose={()=>setShowAdminCat(false)}/>
              </div>
            </div>}
          </div>
        )}

        {tab==="subscribers"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,marginBottom:18}}>Subscribers</div>
            <SubscriberManager/>
          </div>
        )}

        {tab==="analytics"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,marginBottom:18}}>Analytics</div>
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:16,padding:32,textAlign:"center"}}>
              <div style={{fontSize:38,marginBottom:10}}>📈</div>
              <div style={{fontSize:14,color:"#555"}}>Analytics connect to your backend in production.</div>
            </div>
          </div>
        )}
      </div>

      {editW&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(6px)"}} onClick={()=>setEditW(null)}>
          <div style={{background:"#1A1A2E",borderRadius:20,padding:28,width:"min(94vw,500px)",maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)",animation:"popIn 0.3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff",marginBottom:20}}>Edit Word</div>
            <AdminWordForm word={editW} defaultPhoto={defPhotos[String(editW.id)]} onPhotoChange={(url)=>setDefPhotos(p=>{const n={...p};if(url){n[String(editW.id)]=url;}else{delete n[String(editW.id)];}return n;})} onSave={w=>{setWords(p=>p.map(x=>x.id===w.id?w:x));setEditW(null);}} onDelete={id=>{setWords(p=>p.filter(x=>x.id!==id));setEditW(null);}} onClose={()=>setEditW(null)}/>
          </div>
        </div>
      )}
      {addW&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(6px)"}} onClick={()=>setAddW(false)}>
          <div style={{background:"#1A1A2E",borderRadius:20,padding:28,width:"min(94vw,500px)",maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)",animation:"popIn 0.3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff",marginBottom:4}}>➕ Add Word to Library</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:20,lineHeight:1.5}}>This word will appear in every teacher's word library on the platform.</div>
            <AdminWordForm onSave={w=>{setWords(p=>[...p,{...w,id:Date.now()}]);setAddW(false);}} onClose={()=>setAddW(false)}/>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminWordForm({word,onSave,onDelete,onClose}){
  const [f,setF]=useState(word||{cat:"core",word:"",display:"",emoji:"",photo:"",color:"#1B65B8",triggers:[""]});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const dark={width:"100%",padding:"9px 12px",border:"2px solid rgba(255,255,255,0.12)",borderRadius:10,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",background:"rgba(255,255,255,0.06)",color:"#fff"};
  const lbl={fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block",fontFamily:"'Nunito',sans-serif"};
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[["Word — what the teacher says","word"],["Display Text — what students see","display"],["Emoji Icon","emoji"],["Photo Search Hint","photo"]].map(([l,k])=>(
          <div key={k}><label style={lbl}>{l}</label><input value={f[k]||""} onChange={e=>s(k,e.target.value)} style={dark}/></div>
        ))}
        <div>
          <label style={lbl}>Category</label>
          <select value={f.cat} onChange={e=>s("cat",e.target.value)} style={{...dark,color:f.cat?"#fff":"rgba(255,255,255,0.4)"}}>
            {CATS.map(c=><option key={c.id} value={c.id} style={{background:"#1A1A2E"}}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Color</label>
          <input type="color" value={f.color||"#1B65B8"} onChange={e=>s("color",e.target.value)} style={{width:44,height:34,border:"none",cursor:"pointer",borderRadius:6,background:"transparent"}}/>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Voice triggers (one per line)</label>
        <textarea value={(f.triggers||[]).join("\n")} onChange={e=>s("triggers",e.target.value.split("\n"))} rows={4} style={{...dark,resize:"vertical"}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        {word&&<button onClick={()=>onDelete(word.id)} style={{padding:"10px 14px",borderRadius:10,border:"2px solid #E74C3C",background:"transparent",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>Delete</button>}
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid rgba(255,255,255,0.15)",background:"transparent",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(f)} style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:"#6C5CE7",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:15,cursor:"pointer"}}>Save Word</button>
      </div>
    </div>
  );
}

// ── Teacher app ───────────────────────────────────────────────
function TeacherApp({user,words,onLogout,daysLeft=null,onGoHome,autoStart=false}){
  // ── In-app Stripe payment ───────────────────────────────────────
  const [showStripeInApp,setShowStripeInApp] = useState(false);
  const [stripeInAppPlan,setStripeInAppPlan] = useState("monthly");

  // ── App Mode ─────────────────────────────────────────────────────
  const [appMode,setAppMode]       = useState("aac"); // aac | workingfor | firstthen | choice
  const [showModeMenu,setShowModeMenu] = useState(false);

  // ── Working For state ─────────────────────────────────────────
  const [workingForItem,setWorkingForItem] = useState(null);
  const [wfStage,setWfStage]             = useState("idle");
  const [showWorkingForPicker,setShowWorkingForPicker] = useState(false);
  const [workingForActive,setWorkingForActive] = useState(false);

  // ── First Then state ──────────────────────────────────────────
  const [firstItem,setFirstItem]   = useState(null);
  const [thenItem,setThenItem]     = useState(null);
  const [firstThenStage,setFirstThenStage] = useState("idle"); // idle | first | then | complete

  // ── Choice Board state ────────────────────────────────────────
  const [choiceItems,setChoiceItems]   = useState([]);
  const [choiceSelected,setChoiceSelected] = useState(null);
  const [choiceListening,setChoiceListening] = useState(false);
  const [choiceStage,setChoiceStage]   = useState("idle"); // idle | listening | display

  const [students,setStudents]   = useState(mem.get(`stu_${user.id}`, user.id==="demo"?DEMO_STUDENTS:[]));
  const [customW,setCustomW]     = useState(mem.get(`cw_${user.id}`,[]));
  const [userCats,setUserCats]   = useState(mem.get(`cats_${user.id}`,[]));
  const [showAddCat,setShowAddCat] = useState(false);

  // ── AI Scaffolding Engine state ─────────────────────────────────
  const [aiMode,setAiMode]             = useState(true);   // AI auto-level on/off
  const [responseTimer,setResponseTimer] = useState(null); // ms since instruction
  const [timerStart,setTimerStart]     = useState(null);   // when timer started
  const [lastInstruction,setLastInstruction] = useState(null); // last matched word
  const [trialLog,setTrialLog]         = useState([]);     // session trial data
  const [suggestedWords,setSuggestedWords] = useState([]); // unmatched frequent phrases
  const [unmatchedPhrases,setUnmatchedPhrases] = useState({}); // phrase→count map
  const [aiStatus,setAiStatus]         = useState(""); // status message
  const [showAiPanel,setShowAiPanel]   = useState(false);
  const timerRef   = useRef(null);
  const trialRef   = useRef({});   // {studentId_wordId: {correct:0, incorrect:0, level:1}}

  // Praise words that indicate an INDEPENDENT correct response (advances the streak)
  const PRAISE = ["good job","great job","nice work","excellent","perfect","yes","good","nice","wonderful","amazing","fantastic","right","correct","good work","well done","that's right","awesome"];

  // Correction / error words — teacher signalling the response was wrong.
  // Only counted while a trial is OPEN (see closeTrial), so stray words never penalize.
  // Tune these to your classroom's language.
  const CORRECTION = ["no","nope","not quite","not yet","try again","try it again","almost","that's not it","not that one","wrong","incorrect"];

  // Load trial data from memory
  useEffect(()=>{
    const saved = mem.get(`trials_${user.id}`,{});
    trialRef.current = saved;
  },[]);

  // ── Load ALL data from Supabase on mount ──────────────────────
  useEffect(()=>{
    const loadFromSupabase = async () => {

      // 1. Load students
      try {
        const stuData = await sbAuth.getStudents(user.id);
        if(stuData && stuData.length > 0){
          const formatted = stuData.map(s=>({
            id: s.id,
            supabaseId: s.id,
            name: s.name,
            avatar: s.avatar || "🧑",
            color: s.color || "#1B65B8",
            level: s.starting_level || 1,
            progress: {},
          }));
          setStudents(formatted);
          mem.set(`stu_${user.id}`, formatted);
        }
      } catch(e){ console.log("Students load error:", e); }

      // 2. Load progress data
      try {
        const progData = await sbAuth.getProgress(user.id);
        if(progData && progData.length > 0){
          // Convert flat rows into trialRef structure
          const trials = {};
          progData.forEach(p=>{
            const key = `${p.student_id}_${p.word_id}`;
            trials[key] = {
              level: p.level || 1,
              correct: p.correct_count || 0,
              incorrect: p.incorrect_count || 0,
              streak: 0,
            };
          });
          trialRef.current = {...trialRef.current, ...trials};
          mem.set(`trials_${user.id}`, trialRef.current);
        }
      } catch(e){ console.log("Progress load error:", e); }

      // 3. Load photos from Supabase storage
      try {
        const photoMap = await sbAuth.getPhotos(user.id);
        if(photoMap && Object.keys(photoMap).length > 0){
          setPhotos(prev=>{
            const merged = {...prev, ...photoMap};
            // Also update local memory cache
            Object.entries(photoMap).forEach(([wid, url])=>{
              mem.set(`photo_${wid}_${user.id}`, url);
            });
            return merged;
          });
        }
      } catch(e){ console.log("Photos load error:", e); }

      // 4. Load custom words
      try {
        const districtId = user.district_id || null;
        const words = await sbAuth.getCustomWords(user.id, districtId);
        if(words && words.length > 0){
          const formatted = words.map(w=>({
            id: w.id || `cw_${w.word}`,
            cat: w.category || "custom",
            word: w.word,
            display: w.display || w.word?.toUpperCase(),
            emoji: w.emoji || "⭐",
            photo: w.photo_hint || "",
            color: w.color || "#1B65B8",
            triggers: w.triggers || [w.word],
            supabaseId: w.id,
          }));
          setCustomW(formatted);
          mem.set(`cw_${user.id}`, formatted);
        }
      } catch(e){ console.log("Custom words load error:", e); }
    };
    loadFromSupabase();
  },[user.id]); // eslint-disable-line

  // Save trial data
  const saveTrials = useCallback(()=>{
    mem.set(`trials_${user.id}`, trialRef.current);
  },[user.id]);

  // Get student's level for a specific word
  const getStudentWordLevel = useCallback((studentId, wordId)=>{
    const key = `${studentId}_${wordId}`;
    return trialRef.current[key]?.level || 1;
  },[]);

  // Log a trial result and adjust level.
  // outcome: "independent" (praise, no prompt) | "prompted" (teacher re-cued the word)
  //        | "correction" (teacher said it was wrong, or repeated the prompt)
  // Independent advances the streak (3 in a row -> level up).
  // Prompted/correction reset the streak and count toward a level-down (2 in a row -> down).
  const logTrial = useCallback((studentId, wordId, outcome, responseTime)=>{
    const key = `${studentId}_${wordId}`;
    if(!trialRef.current[key]){
      trialRef.current[key] = { correct:0, prompted:0, incorrect:0, level:1, streak:0, missStreak:0 };
    }
    const trial = trialRef.current[key];
    const currentLevel = trial.level;
    const stuName = students.find(s=>s.id===studentId)?.name || "Student";

    if(outcome === "independent"){
      trial.correct++;
      trial.streak = (trial.streak||0) + 1;
      trial.missStreak = 0;
      if(trial.streak >= 3 && trial.level < 4){
        trial.level++;
        trial.streak = 0;
        setAiStatus(`✨ ${stuName} advanced to Level ${trial.level} on "${wordId}"!`);
        setTimeout(()=>setAiStatus(""),4000);
      }
    } else {
      // non-independent: prompted OR correction — both break the independent streak
      if(outcome === "prompted") trial.prompted = (trial.prompted||0) + 1;
      else trial.incorrect++;            // correction — noted as an error
      trial.streak = 0;
      trial.missStreak = (trial.missStreak||0) + 1;
      if(trial.missStreak >= 2 && trial.level > 1){
        trial.level--;
        trial.missStreak = 0;
        setAiStatus(`↩️ Adjusting to Level ${trial.level} for better support`);
        setTimeout(()=>setAiStatus(""),3000);
      }
    }

    // Log to session trail — `outcome` documents the exact type; `correct` kept for existing UI
    setTrialLog(prev=>[...prev,{
      studentId, wordId, outcome, correct: outcome === "independent", responseTime,
      level: currentLevel, timestamp: new Date().toISOString()
    }]);

    saveTrials();
    // Persist to Supabase asynchronously (correct = independent, incorrect = corrections)
    const trialData = trialRef.current[key];
    if(trialData && supabase){
      sbAuth.saveProgress(studentId, wordId, trialData.level, trialData.correct, trialData.incorrect, user.id)
        .catch(e=>console.log("Progress save error:", e));
    }
  },[students, saveTrials, user.id]);

  // Choice-board selections are PREFERENCE data — recorded separately, never mixed
  // into word-level (academic) trial data. `count` = times picked; `reward` = times
  // picked from the "Working for?" reinforcer picker.
  const recordPreference = (studentId, item, isReward)=>{
    if(!studentId || !item) return;
    const key = `prefs_${user.id}`;
    const store = mem.get(key, {});
    const sid = String(studentId);
    if(!store[sid]) store[sid] = {};
    const itemKey = String(item.id||item.word||item.label||"item");
    if(!store[sid][itemKey]) store[sid][itemKey] = { label:"", count:0, reward:0 };
    store[sid][itemKey].label = item.display||item.label||item.word||itemKey;
    store[sid][itemKey].count += 1;
    if(isReward) store[sid][itemKey].reward += 1;
    mem.set(key, {...store});
  };

  // Semantic matching via Claude API
  // FERPA COMPLIANCE: Student names and identifying information are
  // NEVER sent to the API. Only anonymous classroom phrases are matched
  // against the word list. No student data leaves the SaySee platform.
  const semanticMatch = useCallback(async(transcript, wordList)=>{
    try {
      // Strip all student names from transcript before sending to API
      let sanitized = transcript.toLowerCase().trim();
      studentsRef.current.forEach(s=>{
        const firstName = s.name.split(" ")[0].toLowerCase();
        const lastName = s.name.split(" ").slice(-1)[0].toLowerCase();
        sanitized = sanitized.replace(new RegExp(firstName,"gi"),"[student]");
        sanitized = sanitized.replace(new RegExp(lastName,"gi"),"[student]");
      });

      // Only send the sanitized phrase — no student context, no identifiers
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:50,
          messages:[{
            role:"user",
            // PRIVACY: Only sends anonymous classroom phrase + word list
            // No student names, IDs, progress data, or identifying info
            content:`Match this classroom instruction to one AAC word.
Phrase: "${sanitized}"
Words: ${wordList.map(w=>w.word).join(", ")}
Reply with ONLY the matching word or NO_MATCH.`
          }]
        })
      });
      const data = await response.json();
      const result = data.content?.[0]?.text?.trim();
      if(result && result !== "NO_MATCH"){
        return wordList.find(w=>w.word===result.toLowerCase()) || null;
      }
    } catch(e){ console.log("Semantic match error",e); }
    return null;
  },[]);

  // Track unmatched phrases for suggestions
  const trackUnmatched = useCallback((phrase)=>{
    setUnmatchedPhrases(prev=>{
      const updated = {...prev, [phrase]:(prev[phrase]||0)+1};
      // Suggest if phrase used 3+ times
      if(updated[phrase]>=3){
        setSuggestedWords(s=>s.includes(phrase)?s:[...s,phrase]);
      }
      return updated;
    });
  },[]);
  const [photos,setPhotos]       = useState(()=>{ const p={}; /* load any saved photos */ return p; });
  const [photoModal,setPhotoModal] = useState(null); // word entry awaiting photo
  const allWords                 = [...words.filter(w=>w.cat!=="custom"),...customW];

  const [activeId,setActiveId]   = useState(students[0]?.id||null);
  const [activeCat,setActiveCat] = useState("core");
  const [curWord,setCurWord]     = useState(null);
  const [level,setLevel]         = useState(1);
  const [listening,setListening] = useState(false);
  const [transcript,setTrans]    = useState("");
  const [flash,setFlash]         = useState(false);
  const [stuMode,setStuMode]     = useState(false);
  const [drawer,setDrawer]       = useState(false);
  const [dtab,setDtab]           = useState("students");
  const [addStu,setAddStu]       = useState(false);
  const [editStu,setEditStu]     = useState(null);
  const [addWord,setAddWord]     = useState(false);
  const [shareInfo,setShareInfo] = useState(null);

  const recRef  = useRef(null);
  const lisRef  = useRef(false);
  const wRef    = useRef(allWords);
  const studentsRef    = useRef(students);
  const activeIdRef    = useRef(activeId);
  const aiModeRef      = useRef(true);
  const lastInstructionRef = useRef(null);
  const timerStartRef  = useRef(null);
  const promptCountRef  = useRef(0);    // re-prompts within the current open trial
  const trialTimeoutRef = useRef(null); // 15s "assume followed" timeout for the open trial

  // ── Silent audio keep-alive ──
  // The browser's speech-recognition engine plays a system "earcon" (a beep)
  // every time it starts/restarts. On tablets (the typical school device) it's
  // loud, and the onend→start() loop makes it repeat. There is no Web Speech
  // flag to mute it, but holding the audio-output session active with a
  // zero-gain node suppresses the earcon. This produces NO audible sound
  // (gain is exactly 0) — it only keeps the output stream "running".
  const silentRef = useRef(null);
  const startSilent = useCallback(()=>{
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      let s = silentRef.current;
      if(!s){
        const ctx  = new AC();
        const gain = ctx.createGain();
        gain.gain.value = 0;          // fully silent — never makes noise
        const osc  = ctx.createOscillator();
        osc.frequency.value = 30;     // sub-audible; irrelevant at gain 0
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        s = { ctx, osc, gain };
        silentRef.current = s;
      }
      if(s.ctx.state === "suspended") s.ctx.resume().catch(()=>{});
    }catch{}
  },[]);
  const stopSilent = useCallback(()=>{
    const s = silentRef.current;
    if(!s) return;
    silentRef.current = null;
    try{ s.osc.stop(); }catch{}
    try{ s.ctx.close(); }catch{}
  },[]);

  useEffect(()=>{wRef.current=allWords;},[allWords]);
  useEffect(()=>{ studentsRef.current = students; },[students]);
  useEffect(()=>{ activeIdRef.current = activeId; },[activeId]);
  useEffect(()=>{ aiModeRef.current = aiMode; },[aiMode]);
  const appModeRef = useRef("aac");
  const choiceStageRef = useRef("idle");
  useEffect(()=>{ appModeRef.current = appMode; },[appMode]);
  useEffect(()=>{ choiceStageRef.current = choiceStage; },[choiceStage]);

  // First-Then usage measure — counts each completed First-Then for the active student.
  // Measures USE of the First-Then support only; not a correct/incorrect judgement,
  // and kept separate from word-level (academic) trial data.
  useEffect(()=>{
    if(firstThenStage === "complete"){
      const sid = activeIdRef.current;
      if(sid){
        const key = `ftUsage_${user.id}`;
        const store = mem.get(key, {});
        const k = String(sid);
        if(!store[k]) store[k] = { count:0, last:null };
        store[k].count += 1;
        store[k].last = new Date().toISOString();
        mem.set(key, {...store});
      }
    }
  },[firstThenStage, user.id]);

  useEffect(()=>{mem.set(`stu_${user.id}`,students);},[students]);
  useEffect(()=>{mem.set(`cw_${user.id}`,customW);},[customW]);
  useEffect(()=>{mem.set(`cats_${user.id}`,userCats);},[userCats]);
  const allCats = [...CATS, ...userCats];

  // Save working for per student
  const getStudentReinforcer = (studentId) => mem.get(`wf_${studentId}`, null);
  const setStudentReinforcer = (studentId, item) => {
    mem.set(`wf_${studentId}`, item);
    setWorkingForItem(item);
    setWorkingForActive(true);
  };

  const activeStu = students.find(s=>s.id===activeId)||null;
  useEffect(()=>{if(activeStu)setLevel(activeStu.level);},[activeId]);

  const [micError,setMicError]=useState("");

  const startMic=useCallback(()=>{
    setMicError("");
    startSilent(); // keep audio output active so the recognition "beep" stays silent
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      setMicError("Needs Chrome or Edge browser for voice recognition.");
      return;
    }
    if(recRef.current){ lisRef.current=false; try{recRef.current.stop();}catch{} recRef.current=null; }
    try{
      const rec=new SR();
      rec.continuous=true; rec.interimResults=true; rec.lang="en-US"; rec.maxAlternatives=3;
      rec.onstart=()=>{ setListening(true); setMicError(""); startSilent(); };
      rec.onresult=(e)=>{
        for(let i=e.resultIndex;i<e.results.length;i++){
          // Use interim results for faster display
          const isFinal = e.results[i].isFinal;
          const t=e.results[i][0].transcript.toLowerCase().trim();
          if(!t) continue;
          if(e.results[i].isFinal){
            setTrans(t);

            // ── 1. Check for student name — auto-switch profile ──
            const studentMatch = studentsRef.current.find(s=>{
              const first = (s.name||"").split(" ")[0].toLowerCase().trim();
              if(!first) return false;
              try { return new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(t); }
              catch { return t.includes(first); }
            });
            if(studentMatch && studentMatch.id !== activeIdRef.current){
              setActiveId(studentMatch.id);
              activeIdRef.current = studentMatch.id;
              setAiStatus(`👤 Switched to ${studentMatch.name}`);
              setTimeout(()=>setAiStatus(""),2500);
              // Restore working for for this student
              const savedReinforcer = mem.get(`wf_${studentMatch.id}`, null);
              if(savedReinforcer) setWorkingForItem(savedReinforcer);
            }

            // ── 1b. Working For — "what are you working for" ──
            const wfPhrases = ["what are you working for","working for","what do you get","what are we working for","what are you earning","what do you earn"];
            if(wfPhrases.some(p=>t.includes(p))){
              // Always show choice board with reinforcers so student can pick
              // Load reinforcers as choices on the choice board
              setChoiceItems(REINFORCERS.slice(0,6)); // show first 6 as default choices
              setChoiceSelected(null);
              setChoiceStage("workingfor_pick"); // special stage - picking reinforcer
              setAppMode("choice");
              setAiStatus("🌟 Student picks their reward...");
              setTimeout(()=>setAiStatus(""),3000);
              return;
            }

            // ── 1c. Listen for reinforcer name while in working for mode ──
            if(appModeRef.current === "workingfor" && !showWorkingForPicker){
              const reinforcerMatch = REINFORCERS.find(r=>
                t.includes(r.label.toLowerCase()) ||
                t.includes(r.id.toLowerCase())
              );
              if(reinforcerMatch && activeIdRef.current){
                setStudentReinforcer(activeIdRef.current, reinforcerMatch);
              }
            }

            // ── 1d. First-Then ──
            // Handle full sentence: "first sit down then you can have a snack"
            // Also supports "if you sit down then you can have a snack"
            const hasFirst = t.includes("first") || /\bif\b/.test(t);
            const hasThen  = t.includes("then");

            if(hasFirst && hasThen){
              // Full sentence detected — parse both parts at once
              setAppMode("firstthen");
              const firstPart = t.split(/\bthen\b/i)[0].replace(/^(first|if)\s*/i,"").trim();
              const thenPart  = t.split(/\bthen\b/i)[1]?.replace(/^(you can|you get|you may|have|get)\s*/i,"").trim()||"";
              const taskMatch = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>firstPart.includes(tr)));
              if(taskMatch) setFirstItem(taskMatch);
              const rMatch = REINFORCERS.find(r=>thenPart.includes(r.label.toLowerCase())||thenPart.includes(r.id));
              if(rMatch){ setThenItem({...rMatch,isThenReinforcer:true}); }
              else {
                const wordMatch2 = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>thenPart.includes(tr)));
                if(wordMatch2) setThenItem(wordMatch2);
              }
              setFirstThenStage("complete");
              return;
            }

            if(hasFirst && !hasThen){
              setAppMode("firstthen");
              setFirstThenStage("first");
              setThenItem(null);
              const afterFirst = t.replace(/^(first|if)\s*/i,"").trim();
              if(afterFirst.length > 1){
                const taskMatch = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>afterFirst.includes(tr)));
                if(taskMatch) setFirstItem(taskMatch);
              }
              return;
            }

            if(hasThen && appModeRef.current==="firstthen"){
              setFirstThenStage("then");
              const afterThen = t.replace(/.*?\bthen\b\s*/i,"").replace(/^(you can|you get|you may|have|get)\s*/i,"").trim();
              if(afterThen.length > 1){
                const rMatch = REINFORCERS.find(r=>afterThen.includes(r.label.toLowerCase())||afterThen.includes(r.id));
                if(rMatch){ setThenItem({...rMatch,isThenReinforcer:true}); setFirstThenStage("complete"); }
                else {
                  const wordMatch = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>afterThen.includes(tr)));
                  if(wordMatch){ setThenItem(wordMatch); setFirstThenStage("complete"); }
                }
              }
              return;
            }

            // ── 1e. Choice Board ──
            const choicePhrases = ["make a choice","what do you want","choose","which one","pick one","what would you like","you choose"];
            if(choicePhrases.some(p=>t.includes(p))){
              setAppMode("choice");
              setChoiceItems([]);
              setChoiceSelected(null);
              setChoiceStage("listening");
              setAiStatus("🎯 Listening for choices...");
              setTimeout(()=>setAiStatus(""),3000);
              return;
            }
            // Add choices when in choice listening mode
            if(choiceStageRef.current === "listening"){
              const choiceWord = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>t.includes(tr)));
              const choiceReinforcer = REINFORCERS.find(r=>t.includes(r.label.toLowerCase()));
              const newChoice = choiceWord || (choiceReinforcer ? {...choiceReinforcer, display:choiceReinforcer.label} : null);
              if(newChoice){
                // Fetch image for this choice from Pexels
                const PEXELS_KEY = import.meta.env.VITE_PEXELS_KEY||"";
                const wordStr = (newChoice.word||"").toLowerCase();
                const cachedImg = mem.get(`word_img_v4_${wordStr.replace(/\s+/g,'_')}`, null);
                const enrichedChoice = {...newChoice, imgUrl: cachedImg||null};

                if(PEXELS_KEY && !cachedImg){
                  // Fetch in background
                  fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(wordStr+" plain white background")}&per_page=1&orientation=square&size=medium`,
                    {headers:{Authorization:PEXELS_KEY}})
                  .then(r=>r.json()).then(d=>{
                    const p = d.photos?.[0]?.src||{};
                    const url = p.large||p.medium||p.small;
                    if(url){
                      mem.set(`word_img_v4_${wordStr.replace(/\s+/g,'_')}`, url);
                      setChoiceItems(prev=>prev.map(c=>
                        c.id===newChoice.id ? {...c, imgUrl:url} : c
                      ));
                    }
                  }).catch(()=>{});
                }

                setChoiceItems(prev=>{
                  if(prev.length >= 6) return prev;
                  if(prev.find(c=>c.id===newChoice.id)) return prev;
                  return [...prev, enrichedChoice];
                });
              }
              return;
            }

            // ── trial helpers: word-boundary matching + open/close (defined per result) ──
            const escRx = (s)=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
            const phraseHit = (text, phrase)=>{ try { return new RegExp(`\\b${escRx(phrase)}\\b`,'i').test(text); } catch { return text.includes(phrase); } };
            const matchesTrigger = (transcript, trigger)=>{
              // short words need a word boundary so "go" doesn't match inside "good"/"going"
              if(String(trigger).length <= 3){ try { return new RegExp(`\\b${escRx(trigger)}\\b`,'i').test(transcript); } catch { return transcript.includes(trigger); } }
              return transcript.includes(trigger);
            };
            const closeTrial = (outcome, responseTime)=>{
              const word = lastInstructionRef.current;
              const studentId = activeIdRef.current;
              clearTimeout(trialTimeoutRef.current);
              clearInterval(timerRef.current);
              setResponseTimer(null);
              lastInstructionRef.current = null;
              timerStartRef.current = null;
              promptCountRef.current = 0;
              // "benign" = 15s passed with no prompt/correction -> assume directive followed -> MAINTAIN (no score)
              if(!word || !studentId || outcome === "benign") return;
              logTrial(studentId, word.id, outcome, responseTime||0);
              setLevel(getStudentWordLevel(studentId, word.id));
            };
            const startTrialTimeout = ()=>{
              clearTimeout(trialTimeoutRef.current);
              trialTimeoutRef.current = setTimeout(()=>{
                if(!lastInstructionRef.current) return;
                const rt = Date.now() - (timerStartRef.current||Date.now());
                // a prompt was given but nothing resolved it -> prompted; clean silence -> benign (maintain)
                closeTrial(promptCountRef.current >= 1 ? "prompted" : "benign", rt);
              }, 15000);
            };
            const openTrial = (word)=>{
              // a directive / one-word statement returns us to the listening (Say) page
              if(appModeRef.current==="firstthen" || appModeRef.current==="choice"){
                setAppMode("aac"); appModeRef.current="aac";
                setFirstItem(null); setThenItem(null); setFirstThenStage("idle");
                setChoiceItems([]); setChoiceSelected(null);
                setChoiceStage("idle"); choiceStageRef.current="idle";
              }
              clearTimeout(trialTimeoutRef.current);
              setCurWord(word);
              setFlash(true);
              setTimeout(()=>setFlash(false),700);
              lastInstructionRef.current = word;
              timerStartRef.current = Date.now();
              promptCountRef.current = 0;
              clearInterval(timerRef.current);
              timerRef.current = setInterval(()=>{ setResponseTimer(Date.now() - (timerStartRef.current||Date.now())); },100);
              if(activeIdRef.current && aiModeRef.current){ setLevel(getStudentWordLevel(activeIdRef.current, word.id)); }
              startTrialTimeout();
            };

            // ── 2. Teacher feedback on an OPEN trial (Say screen only) ──
            if(appModeRef.current === "aac" && lastInstructionRef.current){
              const openWord = lastInstructionRef.current;
              const trigs = openWord.triggers || [openWord.word];
              const saidTargetWord = trigs.some(tr=>matchesTrigger(t,tr));
              // strip the target word out before testing praise/correction, so a TARGET word
              // that is itself a feedback word (e.g. "no", "yes") isn't misread as feedback
              let fb = " "+t+" ";
              trigs.forEach(tr=>{ try{ fb = fb.replace(new RegExp(`\\b${escRx(tr)}\\b`,'gi')," "); }catch{} });
              const praiseHit = PRAISE.some(p=>phraseHit(fb,p));
              const correctionHit = CORRECTION.some(c=>phraseHit(fb,c));
              const rt = Date.now() - (timerStartRef.current||Date.now());

              if(correctionHit){
                closeTrial("correction", rt);
                setAiStatus("🔄 Correction noted"); setTimeout(()=>setAiStatus(""),1800);
                return;
              }
              if(praiseHit){
                // praise after a prompt is still a prompted trial; praise with no prompt is independent
                closeTrial(promptCountRef.current >= 1 ? "prompted" : "independent", rt);
                return;
              }
              if(saidTargetWord){
                // teacher repeated the target word -> a prompt
                promptCountRef.current += 1;
                if(promptCountRef.current >= 2){
                  closeTrial("correction", rt); // repeated prompt escalates to a correction (error)
                  setAiStatus("🔄 Repeated prompt — logged as correction"); setTimeout(()=>setAiStatus(""),2200);
                } else {
                  setAiStatus("✋ Prompt given"); setTimeout(()=>setAiStatus(""),1500);
                  startTrialTimeout(); // restart the 15s window after the prompt
                }
                return;
              }
              // not feedback for this trial — fall through (could be a brand-new instruction)
            }

            // ── 3. Direct word match -> open a new trial ──
            const directMatch = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>matchesTrigger(t,tr)));
            if(directMatch){
              openTrial(directMatch);
            } else if(t.length > 3 && aiModeRef.current){
              // ── 4. No direct match — try semantic matching ──
              trackUnmatched(t);
              semanticMatch(t, wRef.current).then(semanticWord=>{
                if(semanticWord){ openTrial(semanticWord); }
              });
            }
          } else setTrans(t);
        }
      };
      rec.onerror=(e)=>{
        if(e.error==="not-allowed"||e.error==="service-not-allowed"){
          lisRef.current=false; setListening(false); recRef.current=null;
          setMicError("Mic blocked. Allow microphone in browser settings, then tap again.");
        } else if(e.error==="no-speech"){
          // non-fatal
        } else {
          lisRef.current=false; setListening(false); recRef.current=null;
          setMicError("Mic error: "+e.error+". Tap to retry.");
        }
      };
      rec.onend=()=>{
        if(lisRef.current){ try{ rec.start(); }catch{ lisRef.current=false; setListening(false); } }
        else { setListening(false); }
      };
      recRef.current=rec;
      lisRef.current=true;
      rec.start();
    } catch(err){
      setMicError("Could not start mic. Try opening this app directly in Chrome.");
      lisRef.current=false; setListening(false);
    }
  },[]);

  const stopMic=useCallback(()=>{
    lisRef.current=false; setListening(false); setMicError("");
    try{recRef.current?.stop();}catch{} recRef.current=null;
    stopSilent();
  },[]);

  useEffect(()=>{ return()=>{ lisRef.current=false; try{recRef.current?.stop();}catch{}; try{silentRef.current?.osc.stop();}catch{} try{silentRef.current?.ctx.close();}catch{} silentRef.current=null; }; },[]);

  // Auto-start mic and close drawer when coming from Say tile
  useEffect(()=>{
    if(autoStart){
      setDrawer(false);
      // Small delay to let component mount fully
      setTimeout(()=>{ startMic(); }, 300);
    }
  },[autoStart]);

  const markLearned=(wid)=>{
    if(!activeId)return;
    setStudents(p=>p.map(s=>s.id===activeId?{...s,progress:{...s.progress,[wid]:true}}:s));
  };

  const handlePhotoSaved=async (wordId, dataUrl)=>{
    // Save locally immediately for instant display — key by wordId
    setPhotos(p=>{
      const updated = {...p,[wordId]:dataUrl};
      mem.set(`photos_${user.id}`, updated); // persist entire photo map
      return updated;
    });
    mem.set(`photo_${wordId}_${user.id}`, dataUrl);

    // Upload to Supabase Storage for permanent persistence
    try {
      const publicUrl = await sbAuth.uploadPhoto(wordId, user.id, dataUrl);
      if(publicUrl){
        // Replace local dataUrl with permanent Supabase URL
        setPhotos(p=>({...p,[wordId]:publicUrl}));
        mem.set(`photo_${wordId}_${user.id}`, publicUrl);
      }
    } catch(e){
      console.log("Photo upload to Supabase failed, keeping local:", e);
      // Photo stays as local dataUrl — still works this session
    }
  };

  const shareCode=(stu)=>{
    const code=btoa(stu.name+Date.now()).replace(/[^A-Z0-9]/gi,"").slice(0,8).toUpperCase();
    setShareInfo({stu,code});
  };

  const ac=curWord?.color||(CATS.find(c=>c.id===activeCat)?.color||"#1B65B8");
  const filtered=allWords.filter(w=>w.cat===activeCat);

  if(stuMode) return <StudentMode entry={curWord} level={level} listening={listening} transcript={transcript} onExit={()=>{ setStuMode(false); if(onGoHome) onGoHome(); }}/>;

  // ── Pure listening view (from Say tile) ──────────────────────
  // Show ABA boards when triggered
  if(autoStart && appMode==="firstthen") return(
    <FirstThenBoard
      firstItem={firstItem} thenItem={thenItem} stage={firstThenStage}
      onExit={()=>{setAppMode("aac");appModeRef.current="aac";setFirstItem(null);setThenItem(null);setFirstThenStage("idle");}}/>
  );
  if(autoStart && appMode==="choice") return(
    <ChoiceBoard
      items={choiceItems} selected={choiceSelected}
      stage={choiceStage||"listening"}
      onDone={()=>setChoiceStage("display")}
      onExit={()=>{
        setAppMode("aac"); appModeRef.current="aac";
        setChoiceItems([]); setChoiceSelected(null);
        setChoiceStage("idle"); choiceStageRef.current="idle";
      }}
      onSelect={item=>{
        setChoiceSelected(item);
        setChoiceStage("selected");
        recordPreference(activeId, item, choiceStageRef.current === "workingfor_pick");
      }}/>
  );
  if(autoStart && appMode==="workingfor") return(
    <WorkingForBoard
      reinforcer={workingForItem} stage={wfStage}
      items={REINFORCERS}
      onSelect={item=>{setWorkingForItem(item);setWfStage("selected");mem.set(`wf_${activeId}`,item);}}
      onExit={()=>{setAppMode("aac");setWfStage("idle");}}/>
  );

  if(autoStart) return(
    <div style={{minHeight:"100vh",background:"#1B4F9E",display:"flex",
      flexDirection:"column",position:"relative"}}>
      {/* Minimal header — just back and mic status */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"12px 16px",background:"rgba(0,0,0,0.2)"}}>
        <button onClick={onGoHome} style={{background:"rgba(255,255,255,0.15)",border:"none",
          borderRadius:10,padding:"6px 14px",color:"#fff",fontFamily:"'Nunito',sans-serif",
          fontWeight:800,fontSize:13,cursor:"pointer"}}>← Home</button>
        <SaySeeLogo size={28}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",
            background:listening?"#5AAB2A":"#666",
            boxShadow:listening?"0 0 8px #5AAB2A":""}}/>
          <button onClick={listening?stopMic:startMic}
            style={{background:listening?"#5AAB2A":"rgba(255,255,255,0.15)",
            border:"none",borderRadius:10,padding:"6px 14px",color:"#fff",
            fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            {listening?"👄 Stop":"👄 Start"}
          </button>
        </div>
      </div>

      {/* Student carousel - minimal */}
      {students.length>0&&(
        <div style={{display:"flex",gap:8,padding:"8px 16px",overflowX:"auto",
          scrollbarWidth:"none",background:"rgba(0,0,0,0.1)"}}>
          {students.map(s=>(
            <button key={s.id} onClick={()=>setActiveId(s.id)}
              style={{flexShrink:0,padding:"4px 12px",borderRadius:20,border:"none",
              background:activeId===s.id?"#5AAB2A":"rgba(255,255,255,0.15)",
              color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,
              fontSize:12,cursor:"pointer"}}>
              {s.avatar} {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Main content - word display or listening pulse */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",padding:20}}>
        {curWord?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,
            animation:"popIn 0.4s ease"}}>
            <WordCard entry={curWord} level={level}
              photoOverride={photos[curWord.id]}
              onRequestPhoto={level===1?()=>setPhotoModal(curWord):null}/>
            {level>=2&&<div style={{fontFamily:"'Fredoka One',cursive",
              fontSize:"clamp(32px,10vw,64px)",color:ac,letterSpacing:2,
              textShadow:`0 2px 20px ${ac}66`,textAlign:"center"}}>
              {curWord.display}
            </div>}
            {/* scoring is fully voice-driven — manual correct/no-response buttons removed */}
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
            {listening?(
              <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",
                  background:"#5AAB2A",opacity:0.08,animation:"listenPulse 2s ease-in-out infinite"}}/>
                <div style={{position:"absolute",width:160,height:160,borderRadius:"50%",
                  background:"#5AAB2A",opacity:0.12,animation:"listenPulse 2s ease-in-out infinite 0.3s"}}/>
                <div style={{position:"absolute",width:120,height:120,borderRadius:"50%",
                  background:"#5AAB2A",opacity:0.18,animation:"listenPulse 2s ease-in-out infinite 0.6s"}}/>
                <div style={{width:80,height:80,borderRadius:"50%",
                  background:"linear-gradient(135deg,#5AAB2A,#3d8a1e)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:36,boxShadow:"0 4px 20px #5AAB2A55",zIndex:1}}>👄</div>
              </div>
            ):(
              <div style={{opacity:0.4,fontSize:64}}>👄</div>
            )}
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,
              color:listening?"#5AAB2A":"rgba(255,255,255,0.4)",textAlign:"center"}}>
              {listening?"Listening…":"Tap Start to Listen"}
            </div>
            {aiStatus&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,
              color:"rgba(255,255,255,0.6)",textAlign:"center"}}>{aiStatus}</div>}
          </div>
        )}
      </div>

      {/* Word chips at bottom */}
      <div style={{background:"rgba(0,0,0,0.2)",padding:"8px 12px",
        display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
        {allWords.slice(0,12).map(w=>(
          <button key={w.id} onClick={()=>{setCurWord(w);setLevel(getStudentWordLevel(activeId,w.id));}}
            style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:"none",
            background:curWord?.id===w.id?"#5AAB2A":"rgba(255,255,255,0.15)",
            color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,
            fontSize:12,cursor:"pointer"}}>
            {w.emoji} {w.display}
          </button>
        ))}
      </div>

      {/* Photo modal */}
      {photoModal&&<PhotoModal entry={photoModal}
        onSaved={(id,url)=>{handlePhotoSaved(id,url);setPhotoModal(null);}}
        onClose={()=>setPhotoModal(null)}/>}
    </div>
  );

  // ABA boards for non-autoStart (traditional teacher view)
  if(appMode==="firstthen") return(
    <FirstThenBoard
      firstItem={firstItem} thenItem={thenItem} stage={firstThenStage}
      onExit={()=>{setAppMode("aac");appModeRef.current="aac";setFirstItem(null);setThenItem(null);setFirstThenStage("idle");}}/>
  );
  if(appMode==="choice") return(
    <ChoiceBoard
      items={choiceItems} selected={choiceSelected}
      stage={choiceStage||"listening"}
      onDone={()=>setChoiceStage("display")}
      onExit={()=>{
        setAppMode("aac"); appModeRef.current="aac";
        setChoiceItems([]); setChoiceSelected(null);
        setChoiceStage("idle"); choiceStageRef.current="idle";
      }}
      onSelect={item=>{
        setChoiceSelected(item);
        setChoiceStage("selected");
        recordPreference(activeId, item, choiceStageRef.current === "workingfor_pick");
      }}/>
  );
  if(appMode==="workingfor") return(
    <WorkingForBoard
      reinforcer={workingForItem} stage={wfStage}
      items={REINFORCERS}
      onSelect={item=>{setWorkingForItem(item);setWfStage("selected");mem.set(`wf_${activeId}`,item);}}
      onExit={()=>{setAppMode("aac");setWfStage("idle");}}/>
  );

  return(
    <div style={{minHeight:"100vh",background:flash?"#FFFDE7":"#EEF5FF",transition:"background 0.3s",display:"flex",flexDirection:"column",fontFamily:"'Nunito',sans-serif"}}>

      {/* TOP BAR */}
      <header style={{background:"#fff",boxShadow:"0 2px 14px rgba(0,0,0,0.07)",padding:"9px 14px",display:"flex",alignItems:"center",gap:9}}>
        <SaySeeLogo size={32}/>

        {/* Student carousel */}
        <div style={{flex:1,display:"flex",gap:7,overflowX:"auto",scrollbarWidth:"none",padding:"2px 0"}}>
          {students.map(s=>(
            <button key={s.id} onClick={()=>setActiveId(s.id)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:30,background:activeId===s.id?s.color:"#F0F2F5",border:`2px solid ${activeId===s.id?s.color:"transparent"}`,color:activeId===s.id?"#fff":"#666",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",transition:"all 0.2s",boxShadow:activeId===s.id?`0 2px 10px ${s.color}55`:"none"}}>
              <span style={{fontSize:17}}>{s.avatar}</span>
              {s.name.split(" ")[0]}
            </button>
          ))}
          <button onClick={()=>setAddStu(true)} style={{flexShrink:0,padding:"5px 11px",borderRadius:30,background:"#F0F2F5",border:"2px dashed #C8D0DA",color:"#AAB",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>+</button>
        </div>

        {/* Right controls */}
        <div style={{display:"flex",gap:7,flexShrink:0,alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <button onClick={listening?stopMic:startMic} style={{width:44,height:44,borderRadius:"50%",border:`3px solid ${listening?"#5AAB2A":"#CBD5E0"}`,fontSize:20,cursor:"pointer",background:listening?"linear-gradient(135deg,#2ECC71,#27AE60)":"#fff",boxShadow:listening?"0 0 0 5px #2ECC7133":"0 2px 8px rgba(0,0,0,0.1)",animation:listening?"micGlow 2s ease-in-out infinite":"none",transition:"all 0.3s",display:"flex",alignItems:"center",justifyContent:"center"}}>🎤</button>
            <span style={{fontFamily:"'Nunito',sans-serif",fontSize:9,fontWeight:800,color:listening?"#5AAB2A":"#CBD5E0",letterSpacing:0.5,textTransform:"uppercase"}}>{listening?"ON":"OFF"}</span>
          </div>
          <button onClick={()=>setStuMode(true)} style={{padding:"6px 12px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0984E3,#6C5CE7)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 3px 12px rgba(9,132,227,0.4)"}}>▶ Student</button>
          {/* Mode switcher */}
          <div style={{display:"flex",gap:4,background:"#F0F2F5",borderRadius:10,padding:3,position:"relative"}}>
            {[
              {id:"aac",      icon:"👁️", label:"AAC"},
              {id:"workingfor",icon:"🌟",label:"Working For"},
              {id:"firstthen", icon:"↔️", label:"First-Then"},
              {id:"choice",    icon:"🎯",label:"Choice"},
            ].map(m=>(
              <button key={m.id} onClick={()=>{setAppMode(m.id);if(m.id==="choice"){setChoiceItems([]);setChoiceSelected(null);setChoiceStage("idle");}if(m.id==="firstthen"){setFirstItem(null);setThenItem(null);setFirstThenStage("idle");}}}
                title={m.label}
                style={{width:32,height:32,borderRadius:7,border:"none",fontSize:15,cursor:"pointer",
                  background:appMode===m.id?"#fff":"transparent",
                  boxShadow:appMode===m.id?"0 1px 4px rgba(0,0,0,0.12)":"none",
                  transition:"all 0.15s"}}>
                {m.icon}
              </button>
            ))}
          </div>
          <button onClick={()=>setDrawer(true)} style={{width:38,height:38,borderRadius:9,border:"none",fontSize:17,cursor:"pointer",background:"#F0F2F5",display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
        </div>
      </header>

      {daysLeft!==null&&daysLeft<=3&&(
        <div style={{background:"#FFFBEB",borderBottom:"1px solid #FEEBC8",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span>⏰</span>
          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:13,fontWeight:700,color:"#92600A"}}>
            {daysLeft===0?"Your trial expires today!":`${daysLeft} day${daysLeft===1?"":"s"} left in your free trial`}
          </span>
          <button onClick={()=>{setDrawer(true);setDtab("account");}}
            style={{fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:800,color:"#1B65B8",
            background:"#EEF5FF",padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer"}}>
            Subscribe →
          </button>
        </div>
      )}

      {/* LEVEL BAR */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEF0F4",display:"flex",justifyContent:"center",gap:6,padding:"7px 12px"}}>
        {LEVELS.map(l=>(
          <button key={l.id} onClick={()=>setLevel(l.id)} style={{padding:"5px 13px",borderRadius:30,border:"none",background:level===l.id?ac:"#F0F2F5",color:level===l.id?"#fff":"#777",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",transition:"all 0.2s",boxShadow:level===l.id?`0 3px 12px ${ac}55`:"none"}}>{l.icon} {l.label}</button>
        ))}
      </div>

      {/* CATEGORY BAR */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEF0F4",display:"flex",overflowX:"auto",gap:5,padding:"6px 12px",scrollbarWidth:"none"}}>
        {allCats.map(c=>(
          <button key={c.id} onClick={()=>setActiveCat(c.id)} style={{padding:"4px 11px",borderRadius:30,border:"none",whiteSpace:"nowrap",flexShrink:0,background:activeCat===c.id?c.color:"#F4F5F7",color:activeCat===c.id?"#fff":"#777",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,cursor:"pointer",transition:"all 0.2s",boxShadow:activeCat===c.id?`0 2px 10px ${c.color}55`:"none"}}>{c.icon} {c.label}</button>
        ))}
        {/* Add category button */}
        <button onClick={()=>setShowAddCat(true)} style={{flexShrink:0,padding:"4px 11px",borderRadius:30,border:"2px dashed #C8D0DA",background:"#F8F9FC",color:"#AAB",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>+ Category</button>
      </div>

      {/* MAIN */}
      <main style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:curWord?"0":"18px 16px",gap:curWord?8:16,overflow:"hidden"}}>
        {curWord?(
          <>
            <WordCard entry={curWord} level={level} photoOverride={photos[curWord.id]} onRequestPhoto={level===1?()=>setPhotoModal(curWord):null}/>
            {level>=2&&level<=4&&<div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(28px,8vw,56px)",color:ac,letterSpacing:2,textShadow:`0 2px 14px ${ac}44`,animation:"fadeUp 0.6s ease",textAlign:"center",padding:"4px 16px 8px"}}>{curWord.display}</div>}
            {activeStu&&(
              <button onClick={()=>markLearned(curWord.id)} style={{padding:"8px 20px",borderRadius:30,border:"none",background:activeStu.progress?.[curWord.id]?"#5AAB2A":"#F0F2F5",color:activeStu.progress?.[curWord.id]?"#fff":"#999",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>
                {activeStu.progress?.[curWord.id]?"✅ Learned!":"Mark as Learned"}
              </button>
            )}
          </>
        ):(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,width:"100%",minHeight:"50vw"}}>
            {listening ? (
              <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {/* Outer pulse rings */}
                <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"#5AAB2A",opacity:0.08,animation:"listenPulse 2s ease-in-out infinite"}}/>
                <div style={{position:"absolute",width:160,height:160,borderRadius:"50%",background:"#5AAB2A",opacity:0.12,animation:"listenPulse 2s ease-in-out infinite 0.3s"}}/>
                <div style={{position:"absolute",width:120,height:120,borderRadius:"50%",background:"#5AAB2A",opacity:0.18,animation:"listenPulse 2s ease-in-out infinite 0.6s"}}/>
                {/* Center mic circle */}
                <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#5AAB2A,#3d8a1e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 4px 20px #5AAB2A55",zIndex:1}}>👄</div>
              </div>
            ) : (
              <div style={{textAlign:"center",opacity:0.4}}>
                <div style={{fontSize:68,marginBottom:10}}>🎤</div>
              </div>
            )}
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:listening?"#5AAB2A":"#AAA",textAlign:"center",animation:listening?"fadeUp 0.5s ease":"none"}}>
              {listening?"Listening…":"Tap the mic to start"}
            </div>
          </div>
        )}

        {/* Word chips */}
        {filtered.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,maxWidth:520}}>
            {filtered.map(w=>(
              <button key={w.id} onClick={()=>setCurWord(w)} style={{padding:"5px 12px",borderRadius:30,background:curWord?.id===w.id?w.color:"#fff",border:`2px solid ${curWord?.id===w.id?w.color:"#E4E8EE"}`,color:curWord?.id===w.id?"#fff":"#555",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",transition:"all 0.15s",boxShadow:curWord?.id===w.id?`0 2px 10px ${w.color}55`:"none"}}>
                {w.emoji} {w.display}
                {level===1&&!photos[w.id]&&!getWordPhoto(w.id)&&<span style={{fontSize:9,opacity:0.6}}> 📸</span>}
                {activeStu?.progress?.[w.id]&&<span> ✅</span>}
              </button>
            ))}
          </div>
        )}

        {micError&&(
          <div style={{background:"#FFF3CD",border:"1px solid #FFEAA7",borderRadius:10,padding:"10px 14px",maxWidth:400,textAlign:"center",fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#856404",fontWeight:700}}>
            ⚠️ {micError}
          </div>
        )}
        {/* transcript display removed - AI listens silently */}

        {/* AI Status message */}
        {aiStatus&&<div style={{background:"#F0FFF4",border:"1px solid #C6F6D5",borderRadius:12,padding:"8px 16px",fontFamily:"'Nunito',sans-serif",fontSize:13,fontWeight:700,color:"#276749",animation:"popIn 0.3s ease",maxWidth:400,textAlign:"center"}}>{aiStatus}</div>}

        {/* Response timer */}
        {responseTimer!==null&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"#EEF5FF",borderRadius:12,border:"1px solid #BEE3F8"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#1B65B8",animation:"pulse 1s infinite"}}/>
          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:700,color:"#1B65B8"}}>Response timer: {(responseTimer/1000).toFixed(1)}s</span>
        </div>}

        {/* manual override removed — feedback is detected from teacher speech */}

        {/* Suggested words */}
        {suggestedWords.length>0&&<div style={{background:"#FFFBEB",border:"1px solid #FEEBC8",borderRadius:12,padding:"10px 16px",maxWidth:400,width:"100%"}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:800,color:"#92600A",marginBottom:6}}>💡 Frequently heard — add to library?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {suggestedWords.map(phrase=>(
              <button key={phrase} onClick={()=>setSuggestedWords(p=>p.filter(x=>x!==phrase))} style={{padding:"4px 12px",borderRadius:20,border:"2px solid #F6AD55",background:"#fff",fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:700,color:"#92600A",cursor:"pointer"}}>+ "{phrase}"</button>
            ))}
          </div>
        </div>}
      </main>

      {/* SETTINGS DRAWER */}
      {drawer&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,12,30,0.55)",zIndex:500,backdropFilter:"blur(4px)"}} onClick={()=>setDrawer(false)}>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:"min(94vw,370px)",background:"#fff",overflowY:"auto",animation:"slideR 0.3s ease"}} onClick={e=>e.stopPropagation()}>
            {/* Drawer tabs */}
            <div style={{background:"#F8F9FC",borderBottom:"1px solid #EEF0F4",display:"flex",padding:"12px 16px 0",gap:4,overflowX:"auto",scrollbarWidth:"none"}}>
              {[["students","👤"],["words","📚"],["ai","🤖"],["account","👤"]].map(([t,ic])=>(
                <button key={t} onClick={()=>setDtab(t)} style={{padding:"7px 12px",border:"none",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:dtab===t?"#1B65B8":"#AAA",borderBottom:`3px solid ${dtab===t?"#1B65B8":"transparent"}`,cursor:"pointer",textTransform:"capitalize",whiteSpace:"nowrap"}}>{ic} {t}</button>
              ))}
              <button onClick={()=>setDrawer(false)} style={{marginLeft:"auto",background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#BBB",padding:"0 8px",flexShrink:0}}>✕</button>
            </div>

            <div style={{padding:22}}>
              {/* STUDENTS */}
              {dtab==="students"&&<>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E"}}>Students</div>
                  <div style={{fontSize:12,color:"#AAA"}}>{students.length}/{user.maxStudents||28}</div>
                </div>
                <button onClick={()=>setAddStu(true)} style={{width:"100%",padding:"11px",background:"#1B65B8",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14,cursor:"pointer",marginBottom:14,boxShadow:"0 4px 14px #0984E355"}}>+ Add Student</button>
                {students.map(s=>{
                  const learned=Object.keys(s.progress||{}).length;
                  return(
                    <div key={s.id} style={{background:"#F8F9FC",borderRadius:13,padding:"11px 13px",marginBottom:9,border:`2px solid ${activeId===s.id?s.color:"transparent"}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <div style={{width:38,height:38,borderRadius:"50%",background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.avatar}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:900,fontSize:14,color:"#1A1A2E"}}>{s.name}</div>
                          <div style={{fontSize:11,color:"#AAA"}}>Level {s.level} · {learned} learned</div>
                        </div>
                        <button onClick={()=>shareCode(s)} title="Share" style={{background:"#EEF3FF",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>🔗</button>
                        <button onClick={()=>setEditStu(s)} style={{background:"#F4F5F7",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>✏️</button>
                      </div>
                      {/* progress bars */}
                      <div style={{marginTop:8,display:"flex",gap:4}}>
                        {CATS.filter(c=>c.id!=="custom").map(c=>{
                          const cw=allWords.filter(w=>w.cat===c.id);
                          const cl=cw.filter(w=>s.progress?.[w.id]).length;
                          const pct=cw.length?cl/cw.length*100:0;
                          return(
                            <div key={c.id} title={`${c.label}: ${cl}/${cw.length}`} style={{flex:1,height:4,background:"#E8ECF0",borderRadius:2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:2}}/>
                            </div>
                          );
                        })}
                      </div>
                      {/* AI trial data for this student */}
                      {activeId===s.id&&(()=>{
                        const sessionTrials = trialLog.filter(t=>t.studentId===s.id);
                        const correct = sessionTrials.filter(t=>t.correct).length;
                        const total = sessionTrials.length;
                        const avgTime = total>0 ? (sessionTrials.reduce((a,t)=>a+(t.responseTime||0),0)/total/1000).toFixed(1) : null;
                        return total>0?(
                          <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
                            <div style={{padding:"3px 10px",borderRadius:20,background:"#F0FFF4",border:"1px solid #C6F6D5",fontSize:11,fontWeight:800,color:"#276749"}}>✅ {correct}/{total} correct</div>
                            {avgTime&&<div style={{padding:"3px 10px",borderRadius:20,background:"#EEF5FF",border:"1px solid #BEE3F8",fontSize:11,fontWeight:800,color:"#1B65B8"}}>⏱️ {avgTime}s avg</div>}
                          </div>
                        ):null;
                      })()}
                    </div>
                  );
                })}
              </>}

              {/* WORDS */}
              {dtab==="words"&&<>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E",marginBottom:14}}>Words & Categories</div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <button onClick={()=>setAddWord(true)} style={{flex:2,padding:"11px",background:"#5AAB2A",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:13,cursor:"pointer",boxShadow:"0 4px 14px #5AAB2A55"}}>+ Add Word</button>
                  <button onClick={()=>setShowAddCat(true)} style={{flex:1,padding:"11px",background:"#1B65B8",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:13,cursor:"pointer",boxShadow:"0 4px 14px #1B65B855"}}>+ Category</button>
                </div>
                {userCats.length>0&&<>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,color:"#AAA",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>My Categories</div>
                  {userCats.map(cat=>(
                    <div key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#F8F9FC",borderRadius:11,marginBottom:7,border:`2px solid ${cat.color}33`}}>
                      <span style={{fontSize:20}}>{cat.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:13,color:"#1A1A2E"}}>{cat.label}</div>
                        <div style={{fontSize:11,color:"#BBB"}}>{customW.filter(w=>w.cat===cat.id).length} words</div>
                      </div>
                      <div style={{width:10,height:10,borderRadius:"50%",background:cat.color}}/>
                      <button onClick={()=>setUserCats(p=>p.filter(c=>c.id!==cat.id))} style={{background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#E74C3C"}}>🗑</button>
                    </div>
                  ))}
                  <div style={{height:1,background:"#EEF0F4",margin:"12px 0"}}/>
                </>}
                {customW.length===0&&<div style={{textAlign:"center",padding:"28px 0",color:"#CCC"}}><div style={{fontSize:36,marginBottom:8}}>✏️</div><div style={{fontSize:13}}>No custom words yet</div></div>}
                {customW.map(w=>(
                  <div key={w.id} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"#F8F9FC",borderRadius:11,marginBottom:7}}>
                    <span style={{fontSize:24}}>{w.emoji}</span>
                    <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:"#1A1A2E"}}>{w.display}</div><div style={{fontSize:11,color:"#BBB"}}>{w.cat}</div></div>
                    <button onClick={()=>setCustomW(p=>p.filter(x=>x.id!==w.id))} style={{background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#E74C3C"}}>🗑</button>
                  </div>
                ))}
              </>}

              {/* ACCOUNT */}
              {dtab==="ai"&&<>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E",marginBottom:14}}>🤖 AI Scaffolding</div>

                {/* AI on/off toggle */}
                <div style={{background:"#F8F9FC",borderRadius:14,padding:16,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:"#1A1A2E"}}>Auto-Level Engine</div>
                    <div style={{fontSize:12,color:"#AAA",marginTop:2}}>Automatically adjusts student levels based on responses</div>
                  </div>
                  <button onClick={()=>setAiMode(m=>!m)} style={{padding:"8px 16px",borderRadius:30,border:"none",background:aiMode?"#5AAB2A":"#E0E0E0",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>
                    {aiMode?"ON":"OFF"}
                  </button>
                </div>

                {/* How it works */}
                <div style={{background:"#EEF5FF",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #BEE3F8"}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#1B65B8",marginBottom:8}}>How it works</div>
                  {[
                    ["👂","Listens for your instructions and matches them to words"],
                    ["⏱️","Starts a response timer when an instruction is detected"],
                    ["🎉","Detects praise words to log a correct response"],
                    ["📈","Advances level after 3 correct responses"],
                    ["📉","Drops level if student struggles"],
                    ["👤","Detects student names to auto-switch profiles"],
                    ["💡","Suggests new words from frequently used phrases"],
                  ].map(([icon,text])=>(
                    <div key={text} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                      <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                      <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#2C5282",lineHeight:1.5}}>{text}</span>
                    </div>
                  ))}
                </div>

                {/* Session trial data */}
                {trialLog.length>0&&<>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,color:"#AAA",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Session Data ({trialLog.length} trials)</div>
                  <div style={{maxHeight:200,overflowY:"auto"}}>
                    {[...trialLog].reverse().map((t,i)=>{
                      const stu=students.find(s=>s.id===t.studentId);
                      const word=allWords.find(w=>w.id===t.wordId);
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:t.correct?"#F0FFF4":"#FFF5F5",borderRadius:8,marginBottom:4}}>
                          <span style={{fontSize:16}}>{t.correct?"✅":"❌"}</span>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:12,color:"#1A1A2E"}}>{stu?.name||"Unknown"} — {word?.display||t.wordId}</div>
                            <div style={{fontSize:11,color:"#AAA"}}>Level {t.level} · {t.responseTime>0?`${(t.responseTime/1000).toFixed(1)}s`:"manual"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>}

                {trialLog.length===0&&<div style={{textAlign:"center",padding:"28px 0",color:"#CCC"}}>
                  <div style={{fontSize:36,marginBottom:8}}>🤖</div>
                  <div style={{fontSize:13}}>No trials yet this session.<br/>Start teaching and the AI will track responses automatically.</div>
                </div>}
              </>}

              {dtab==="account"&&<>
                {/* Subscription status */}
                <div style={{background:"#F8F9FC",borderRadius:14,padding:16,marginBottom:14}}>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#AAA",textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,marginBottom:4}}>Current Plan</div>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#1B65B8",textTransform:"capitalize"}}>{user.plan||"Trial"}</div>
                  {user.plan==="trial"&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#E67E22",marginTop:4,fontWeight:700}}>⏰ Trial active — subscribe to keep access</div>}
                </div>
                {/* Contact */}
                <div style={{background:"#EEF5FF",borderRadius:14,padding:16,marginBottom:16,textAlign:"center"}}>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginBottom:6,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Questions or Support</div>
                  <a href="mailto:hello@saysee.io" style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#1B65B8",textDecoration:"none",display:"block"}}>✉️ hello@saysee.io</a>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#AAA",marginTop:4}}>Tap to open in your email app</div>
                </div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E",marginBottom:14}}>Account</div>
                <div style={{background:"#F8F9FC",borderRadius:13,padding:14,marginBottom:12}}>
                  <div style={{fontWeight:900,fontSize:15,color:"#1A1A2E"}}>{user.name}</div>
                  <div style={{fontSize:13,color:"#AAA",marginTop:2}}>{user.email}</div>
                  <div style={{display:"inline-block",marginTop:7,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:800,background:"#0984E322",color:"#1B65B8"}}>{(user.plan||"free").toUpperCase()}</div>
                </div>
                <div style={{background:"#FFF7ED",borderRadius:13,padding:14,marginBottom:12,border:"1px solid #FED7AA"}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#C05621"}}>Students</div>
                  <div style={{fontSize:13,color:"#9C4221",marginTop:4}}>{students.length} of {user.maxStudents||28} used</div>
                  <div style={{height:5,background:"#FEEBC8",borderRadius:3,overflow:"hidden",marginTop:7}}>
                    <div style={{height:"100%",width:`${Math.min(100,students.length/(user.maxStudents||28)*100)}%`,background:"#ED8936",borderRadius:3}}/>
                  </div>
                </div>
                <div style={{background:"#F0FFF4",borderRadius:13,padding:14,marginBottom:18,border:"1px solid #C6F6D5"}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#276749"}}>Subscription</div>
                  <div style={{fontSize:12,color:"#4A856A",marginTop:4,lineHeight:1.6}}>
                    Plan: <b style={{textTransform:"capitalize"}}>{user.plan||"trial"}</b>
                    {user.plan==="monthly"&&" · $28/month"}
                    {user.plan==="annual"&&" · $252/year"}
                  </div>
                  {/* Subscription status */}
                  <div style={{marginTop:8,padding:"10px 14px",borderRadius:10,
                    background: user.plan==="monthly"||user.plan==="annual"||user.plan==="school"?"#EEF5FF":"#FFF8EC",
                    border:`1px solid ${user.plan==="monthly"||user.plan==="annual"||user.plan==="school"?"#BDD7F5":"#FEEBC8"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#666",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>
                        Current Plan
                      </div>
                      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:16,
                        color:user.plan==="monthly"||user.plan==="annual"||user.plan==="school"?"#1B65B8":"#E67E22",
                        textTransform:"capitalize"}}>
                        {user.plan==="monthly"?"Monthly ✅":
                         user.plan==="annual"?"Annual ✅":
                         user.plan==="school"?"School Site ✅":
                         user.plan==="admin"?"Admin ✅":
                         "Free Trial ⏰"}
                      </div>
                    </div>
                    {user.plan==="monthly"&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888",marginTop:2}}>$28/month · Up to 28 students</div>}
                    {user.plan==="annual"&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888",marginTop:2}}>$252/year · Up to 28 students · Best value</div>}
                    {user.plan==="school"&&<div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#888",marginTop:2}}>School Site License · Unlimited students</div>}
                    {(user.plan==="trial"||!user.plan)&&(
                      <>
                        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#E67E22",marginTop:2,fontWeight:700}}>Subscribe to keep full access</div>
                        <div style={{display:"flex",gap:8,marginTop:10}}>
                          <button onClick={()=>{setShowStripeInApp(true);setStripeInAppPlan("monthly");}}
                            style={{flex:1,padding:"9px",borderRadius:10,border:"2px solid #1B65B8",
                            background:"transparent",color:"#1B65B8",fontFamily:"'Nunito',sans-serif",
                            fontWeight:800,fontSize:11,cursor:"pointer"}}>
                            Monthly<br/>$28/mo
                          </button>
                          <button onClick={()=>{setShowStripeInApp(true);setStripeInAppPlan("annual");}}
                            style={{flex:1,padding:"9px",borderRadius:10,border:"none",
                            background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",
                            fontWeight:800,fontSize:11,cursor:"pointer"}}>
                            Annual ⭐<br/>$252/yr
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cancellation / changes via request */}
                  <div style={{marginTop:10,padding:"10px 14px",borderRadius:10,background:"#F8F9FC",border:"1px solid #E8ECF0"}}>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",lineHeight:1.6}}>
                      To upgrade, downgrade, or cancel your subscription contact us — we'll take care of it within 24 hours.
                    </div>
                    <a href="mailto:hello@saysee.io?subject=Subscription Change Request&body=Hi SaySee team,%0A%0AI would like to make a change to my subscription:%0A%0AEmail: " style={{
                      display:"block",marginTop:8,padding:"9px 14px",borderRadius:10,
                      background:"#1B65B8",color:"#fff",fontFamily:"'Nunito',sans-serif",
                      fontWeight:800,fontSize:12,textDecoration:"none",textAlign:"center"}}>
                      ✉️ Contact Us to Make Changes
                    </a>
                  </div>
                </div>
                <button onClick={onLogout} style={{width:"100%",padding:"11px",borderRadius:12,border:"2px solid #E74C3C",background:"#fff",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>Log Out</button>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {addStu&&<StuModal onSave={async s=>{
        if(students.length>=(user.maxStudents||28))return;
        try {
          const saved = await sbAuth.saveStudent(s, user.id);
          const stu = saved ? {...s, id:saved.id, supabaseId:saved.id} : s;
          setStudents(p=>{
            const updated=[...p,stu];
            mem.set(`stu_${user.id}`,updated);
            return updated;
          });
          setActiveId(stu.id);
        } catch(e) {
          // Supabase failed — save locally
          setStudents(p=>{
            const updated=[...p,s];
            mem.set(`stu_${user.id}`,updated);
            return updated;
          });
          setActiveId(s.id);
        }
        setAddStu(false);
      }} onClose={()=>setAddStu(false)} maxReached={students.length>=(user.maxStudents||28)}/>}
      {editStu&&<StuModal existing={editStu} onSave={s=>{setStudents(p=>p.map(x=>x.id===s.id?s:x));setEditStu(null);}} onDelete={id=>{setStudents(p=>p.filter(x=>x.id!==id));if(activeId===id)setActiveId(students.find(s=>s.id!==id)?.id||null);setEditStu(null);}} onClose={()=>setEditStu(null)}/>}
      {addWord&&<CWModal onAdd={async w=>{
        // Save to Supabase for persistence across devices/browsers
        try {
          const saved = await sbAuth.saveCustomWord(w, user.id, user.district_id||null);
          const wordWithId = saved ? {...w, id:saved.id, supabaseId:saved.id} : w;
          setCustomW(p=>{
            const updated=[...p,wordWithId];
            mem.set(`cw_${user.id}`,updated); // also update local cache
            return updated;
          });
        } catch(e) {
          // Supabase failed — save locally only
          console.log("Supabase save failed, saving locally:", e);
          setCustomW(p=>{
            const updated=[...p,w];
            mem.set(`cw_${user.id}`,updated);
            return updated;
          });
        }
      }} onClose={()=>setAddWord(false)}/>}}

      {/* Photo upload modal */}
      {photoModal&&(
        <PhotoModal entry={photoModal} onSaved={(id,url)=>{handlePhotoSaved(id,url);setPhotoModal(null);}} onClose={()=>setPhotoModal(null)}/>
      )}

      {/* Add Category Modal */}
      {showAddCat&&<AddCatModal
        onAdd={cat=>{setUserCats(p=>[...p,cat]);setActiveCat(cat.id);setShowAddCat(false);}}
        onClose={()=>setShowAddCat(false)}
      />}

      {/* In-app subscription payment */}
      {showStripeInApp&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
          <PaymentForm
            user={user}
            plan={stripeInAppPlan}
            onSuccess={paidPlan=>{
              setShowStripeInApp(false);
              setUser(u=>({...u,plan:paidPlan}));
              setDrawer(false);
            }}
            onCancel={()=>setShowStripeInApp(false)}
          />
        </div>
      )}

      {/* Reinforcer Picker */}
      {showWorkingForPicker&&(
        <ReinforcerPicker
          onSelect={r=>{
            if(activeId) setStudentReinforcer(activeId, r);
            else setWorkingForItem(r);
            setShowWorkingForPicker(false);
            setWorkingForActive(true);
          }}
          onClose={()=>setShowWorkingForPicker(false)}
        />
      )}

      {shareInfo&&(
        <Modal onClose={()=>setShareInfo(null)}>
          <MH>🔗 Share {shareInfo.stu.name}</MH>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"#555",marginBottom:18,lineHeight:1.6}}>Share this student's profile with a parent, therapist, or another teacher. They can import it into their SaySee account.</div>
          <div style={{background:"#F8F9FC",borderRadius:12,padding:16,textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:"#AAA",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Share Code</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:30,color:"#1B65B8",letterSpacing:5}}>{shareInfo.code}</div>
          </div>
          <div style={{background:"#FFFBEB",borderRadius:11,padding:11,fontSize:12,color:"#92600A",marginBottom:18}}>ℹ️ Parents/aides get read-only access. Teacher handoffs include full progress data.</div>
          <Btn full onClick={()=>setShareInfo(null)}>Done</Btn>
        </Modal>
      )}
    </div>
  );
}

// ── Photo upload modal ───────────────────────────────────────
function PhotoModal({entry, onSaved, onClose}){
  const inputRef=useRef(null);
  const [preview,setPreview]=useState(getWordPhoto(entry.id)||null);
  const [saving,setSaving]=useState(false);

  const handleFile=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setSaving(true);
    try{
      const dataUrl=await readFileAsDataURL(file);
      setPreview(dataUrl);
      setSaving(false);
    }catch(err){ setSaving(false); }
    e.target.value="";
  };

  const handleSave=()=>{
    if(!preview)return;
    setWordPhoto(entry.id, preview);
    onSaved(entry.id, preview);
  };

  const handleRemove=()=>{
    setWordPhoto(entry.id, null);
    setPreview(null);
  };

  return(
    <Modal onClose={onClose}>
      <MH>📸 Photo for "{entry.display}"</MH>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#666",marginBottom:18,lineHeight:1.6}}>
        Add a real photo for this word from your classroom or environment. A photo of the actual object, place, or activity your students see every day makes this word more meaningful and supports faster learning.
      </div>

      {/* Preview area */}
      <div style={{width:"100%",aspectRatio:"1",borderRadius:20,overflow:"hidden",marginBottom:16,
        background:preview?`#000`:`${entry.color}10`,
        border:preview?"none":`3px dashed ${entry.color}55`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        position:"relative"}}>
        {preview?(
          <>
            <img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <button onClick={handleRemove} style={{position:"absolute",top:10,right:10,
              background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:"50%",
              width:32,height:32,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </>
        ):(
          <>
            <div style={{fontSize:64,marginBottom:10}}>{entry.emoji}</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#AAA",textAlign:"center",padding:"0 20px"}}>
              No photo yet — tap below to add one
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{display:"none"}}/>

      {/* Buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>{ if(inputRef.current){ inputRef.current.removeAttribute("capture"); inputRef.current.click(); }}} style={{
            flex:1,padding:"12px",borderRadius:12,border:`2px solid ${entry.color}`,
            background:"#fff",color:entry.color,fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:14,cursor:"pointer"}}>
            🖼️ Upload Photo
          </button>
          <button onClick={()=>{ if(inputRef.current){ inputRef.current.setAttribute("capture","environment"); inputRef.current.click(); }}} style={{
            flex:1,padding:"12px",borderRadius:12,border:"none",
            background:entry.color,color:"#fff",fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:14,cursor:"pointer",
            boxShadow:`0 4px 14px ${entry.color}55`}}>
            📷 Take Photo
          </button>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={!preview} style={{flex:2,background:entry.color}}>Save Photo</Btn>
        </div>
      </div>

      {saving&&<div style={{textAlign:"center",marginTop:10,fontSize:13,color:"#AAA",fontFamily:"'Nunito',sans-serif"}}>Processing…</div>}

      <div style={{marginTop:16,padding:"10px 14px",background:"#F0FFF4",borderRadius:10,border:"1px solid #C6F6D5"}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#276749",lineHeight:1.6}}>
          ✅ <strong>Your photos stay private.</strong> They're stored on your device and never shared without your permission. No stock photos, no copyright issues.
        </div>
      </div>
    </Modal>
  );
}

// ── Student modal ─────────────────────────────────────────────
function StuModal({existing,onSave,onDelete,onClose,maxReached}){
  const [name,setName]=useState(existing?.name||"");
  const [ava,setAva]=useState(existing?.avatar||AVATARS[0]);
  const [color,setColor]=useState(existing?.color||"#1B65B8");
  const [lvl,setLvl]=useState(existing?.level||1);
  if(maxReached&&!existing) return(
    <Modal onClose={onClose}><MH>Student Limit Reached</MH>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"#555",marginBottom:18}}>You've reached 28 students. Contact us for a school site license.</div>
      <Btn full onClick={onClose}>Close</Btn>
    </Modal>
  );
  return(
    <Modal onClose={onClose}>
      <MH>{existing?"Edit Student":"New Student"}</MH>
      <Field label="Name *" value={name} onChange={setName} placeholder="Student's first name"/>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:7}}>Avatar</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{AVATARS.map(a=><button key={a} onClick={()=>setAva(a)} style={{fontSize:22,background:ava===a?color+"22":"#F4F5F7",border:`2px solid ${ava===a?color:"transparent"}`,borderRadius:9,padding:"3px 7px",cursor:"pointer"}}>{a}</button>)}</div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Color</div>
        <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:42,height:30,border:"none",cursor:"pointer",borderRadius:6}}/>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:7}}>Starting Level</div>
        <div style={{display:"flex",gap:6}}>{LEVELS.map(l=><button key={l.id} onClick={()=>setLvl(l.id)} style={{flex:1,padding:"7px 3px",borderRadius:9,border:"none",background:lvl===l.id?color:"#F0F2F5",color:lvl===l.id?"#fff":"#777",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,cursor:"pointer"}}>{l.icon} {l.label}</button>)}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {existing&&<Btn danger onClick={()=>{onDelete(existing.id);onClose();}}>Delete</Btn>}
        <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
        <Btn onClick={()=>{if(!name.trim())return;onSave({id:existing?.id||`s_${Date.now()}`,name:name.trim(),avatar:ava,color,level:lvl,progress:existing?.progress||{},sharedWith:[]});onClose();}} style={{flex:2}}>Save</Btn>
      </div>
    </Modal>
  );
}

// ── Add Category Modal ───────────────────────────────────────────
const CAT_EMOJIS = ["⭐","🏫","📚","⚽","🍽️","😊","🏃","✏️","🎨","🎵","🌍","🏠","🐾","💊","🧩","🌈","🔢","🔤","🖐️","❤️","🌟","🎯","🧠","💬","🎒"];
const CAT_COLORS = ["#1B65B8","#5AAB2A","#E67E22","#8E44AD","#E74C3C","#00B894","#F1C40F","#1ABC9C","#E91E63","#FF5722","#607D8B","#795548"];

function AddCatModal({onAdd, onClose}){
  const [label,setLabel]   = useState("");
  const [icon,setIcon]     = useState("⭐");
  const [color,setColor]   = useState("#1B65B8");

  return(
    <Modal onClose={onClose}>
      <MH>➕ New Category</MH>
      <Field label="Category Name *" value={label} onChange={setLabel} placeholder="e.g. Morning Routine"/>

      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Icon</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {CAT_EMOJIS.map(e=>(
            <button key={e} onClick={()=>setIcon(e)} style={{
              fontSize:22,padding:"4px 8px",borderRadius:8,cursor:"pointer",
              background:icon===e?color+"22":"#F4F5F7",
              border:`2px solid ${icon===e?color:"transparent"}`,
            }}>{e}</button>
          ))}
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Color</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {CAT_COLORS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} style={{
              width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",
              border:`3px solid ${color===c?"#333":"transparent"}`,
              boxShadow:color===c?`0 0 0 2px ${c}55`:"none"
            }}/>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{background:"#F8F9FC",borderRadius:12,padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#AAA",marginRight:4}}>Preview:</div>
        <button style={{padding:"5px 12px",borderRadius:30,border:"none",background:color,color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"default"}}>{icon} {label||"Category Name"}</button>
      </div>

      <div style={{display:"flex",gap:8}}>
        <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
        <Btn onClick={()=>{
          if(!label.trim())return;
          onAdd({id:`cat_${Date.now()}`,label:label.trim(),icon,color,scope:"teacher"});
          onClose();
        }} color={color} style={{flex:2}}>Create Category</Btn>
      </div>
    </Modal>
  );
}

// ── Custom word modal ─────────────────────────────────────────
function CWModal({onAdd,onClose}){
  const [word,setWord]=useState("");
  const [disp,setDisp]=useState("");
  const [emoji,setEmoji]=useState("");
  const [photo,setPhoto]=useState("");
  const [color,setColor]=useState("#1B65B8");
  const [trigs,setTrigs]=useState("");
  const [cat,setCat]=useState("custom");
  return(
    <Modal onClose={onClose}>
      <MH>➕ Add a Word</MH>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",marginBottom:12,lineHeight:1.5}}>
        Add a word you use regularly with your students. SaySee will display the visual when it hears you say it.
      </div>
      <Field label="Word — what you say *" value={word} onChange={setWord} placeholder="e.g. sit down, apple, outside"/>
      <Field label="Display Text — what students see" value={disp} onChange={setDisp} placeholder="e.g. SIT DOWN, APPLE, OUTSIDE"/>
      <Field label="Emoji — visual icon *" value={emoji} onChange={setEmoji} placeholder="e.g. 🪑 🍎 🌳"/>
      <Field label="Photo Search Hint — helps find a matching image" value={photo} onChange={setPhoto} placeholder="e.g. child sitting in chair, red apple, playground"/>
      <Field label="Voice Triggers — words or phrases that activate this visual (comma separated)" value={trigs} onChange={setTrigs} placeholder="e.g. sit down, take a seat, sit please"/>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Category</div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"2px solid #E8ECF0",borderRadius:10,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none"}}>
          {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Color</div>
        <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:42,height:30,border:"none",cursor:"pointer",borderRadius:6}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
        <Btn onClick={()=>{if(!word.trim()||!emoji.trim())return;onAdd({id:`cw_${Date.now()}`,cat,word:word.trim().toLowerCase(),display:(disp.trim()||word.trim()).toUpperCase(),emoji:emoji.trim(),photo:photo.trim()||word.trim(),color,triggers:[word.trim().toLowerCase(),...trigs.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean)]});onClose();}} style={{flex:2}}>Add Word</Btn>
      </div>
    </Modal>
  );
}

// ── District Admin Panel ─────────────────────────────────────
function DistrictAdminPanel({user, onLogout}){
  const [tab,setTab]           = useState("overview");
  const [teachers,setTeachers] = useState([]);
  const [students,setStudents] = useState([]);
  const [licenses,setLicenses] = useState([]);
  const [loading,setLoading]   = useState(true);

  useEffect(()=>{
    const load = async () => {
      setLoading(true);
      try {
        const [t,s,l] = await Promise.all([
          sbData.getDistrictTeachers(user.district_id),
          sbData.getDistrictStudents(user.district_id),
          sbData.getLicenses(user.district_id)
        ]);
        setTeachers(t); setStudents(s); setLicenses(l);
      } catch(e){ console.log("Load error",e); }
      setLoading(false);
    };
    load();
  },[]);

  const exportCSV = () => {
    const rows = [["Teacher","Email","Students","Last Login"],...teachers.map(t=>[t.name,t.email,students.filter(s=>s.teacher_id===t.id).length,t.last_login||"Never"])];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="SaySee_District_Report.csv"; a.click();
  };

  const usedLicenses = licenses.filter(l=>l.status==="active").length;
  const totalLicenses = licenses.length;

  return(
    <div style={{minHeight:"100vh",background:"#EEF5FF",fontFamily:"'Nunito',sans-serif"}}>
      {/* Header */}
      <header style={{background:"#fff",boxShadow:"0 2px 14px rgba(0,0,0,0.07)",padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}><SaySeeLogo height={28}/><span style={{fontSize:12,color:"#5AAB2A",fontFamily:"'Nunito',sans-serif",fontWeight:700,background:"#27AE6022",padding:"2px 8px",borderRadius:20}}>DISTRICT</span></div>
          <div style={{fontSize:12,color:"#AAA"}}>{user.name} · {user.email}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportCSV} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>⬇️ Export CSV</button>
          <button onClick={onLogout} style={{padding:"8px 14px",borderRadius:10,border:"2px solid #E74C3C",background:"#fff",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>Logout</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEF0F4",display:"flex",padding:"0 20px",gap:4}}>
        {[["overview","📊 Overview"],["teachers","👤 Teachers"],["students","🎓 Students"],["licenses","🔑 Licenses"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"12px 16px",border:"none",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:tab===t?"#1B65B8":"#AAA",borderBottom:`3px solid ${tab===t?"#1B65B8":"transparent"}`,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 18px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:"#AAA",fontFamily:"'Fredoka One',cursive",fontSize:20}}>Loading district data…</div>}

        {!loading&&tab==="overview"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>District Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16,marginBottom:24}}>
              {[
                ["Total Teachers",teachers.length,"#1B65B8","👤"],
                ["Total Students",students.length,"#8E44AD","🎓"],
                ["Licenses Used",`${usedLicenses}/${totalLicenses}`,"#5AAB2A","🔑"],
                ["Available Licenses",totalLicenses-usedLicenses,"#E67E22","✅"],
              ].map(([label,val,color,icon])=>(
                <div key={label} style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderTop:`4px solid ${color}`}}>
                  <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:28,color}}>{val}</div>
                  <div style={{fontSize:12,color:"#AAA",marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#1A1A2E",marginBottom:14}}>License Usage</div>
              <div style={{height:12,background:"#EEF0F4",borderRadius:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${totalLicenses?usedLicenses/totalLicenses*100:0}%`,background:"linear-gradient(90deg,#0984E3,#6C5CE7)",borderRadius:6,transition:"width 0.5s"}}/>
              </div>
              <div style={{fontSize:13,color:"#AAA",marginTop:8}}>{usedLicenses} of {totalLicenses} licenses assigned</div>
            </div>
          </div>
        )}

        {!loading&&tab==="teachers"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>Teachers ({teachers.length})</div>
            {teachers.length===0&&<div style={{textAlign:"center",padding:32,color:"#CCC"}}>No teachers yet in this district.</div>}
            {teachers.map(t=>{
              const stuCount=students.filter(s=>s.teacher_id===t.id).length;
              return(
                <div key={t.id} style={{background:"#fff",borderRadius:14,padding:"14px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"#0984E322",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👤</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:900,fontSize:15,color:"#1A1A2E"}}>{t.name}</div>
                    <div style={{fontSize:12,color:"#AAA"}}>{t.email}</div>
                  </div>
                  <div style={{textAlign:"center",padding:"6px 14px",background:"#EEF5FF",borderRadius:10}}>
                    <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#1B65B8"}}>{stuCount}</div>
                    <div style={{fontSize:10,color:"#AAA"}}>students</div>
                  </div>
                  <div style={{textAlign:"right",fontSize:11,color:"#CCC"}}>Last login<br/>{t.last_login?new Date(t.last_login).toLocaleDateString():"Never"}</div>
                </div>
              );
            })}
          </div>
        )}

        {!loading&&tab==="students"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>Students ({students.length})</div>
            {students.length===0&&<div style={{textAlign:"center",padding:32,color:"#CCC"}}>No students yet in this district.</div>}
            {students.map(s=>{
              const teacher=teachers.find(t=>t.id===s.teacher_id);
              return(
                <div key={s.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:(s.color||"#1B65B8")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.avatar||"🎓"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:900,fontSize:14,color:"#1A1A2E"}}>{s.name}</div>
                    <div style={{fontSize:11,color:"#AAA"}}>Teacher: {teacher?.name||"Unassigned"} · Level {s.current_level}</div>
                  </div>
                  <div style={{padding:"4px 10px",borderRadius:20,background:"#EEF5FF",fontSize:11,fontWeight:800,color:"#666"}}>Level {s.current_level}</div>
                </div>
              );
            })}
          </div>
        )}

        {!loading&&tab==="licenses"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>License Management</div>
            <div style={{background:"#EEF9FF",borderRadius:14,padding:16,marginBottom:20,border:"1px solid #BEE3F8"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#2B6CB0",marginBottom:4}}>ℹ️ How licenses work</div>
              <div style={{fontSize:13,color:"#2C5282",lineHeight:1.6}}>Each license can be assigned to one teacher. When a teacher leaves, reassign their license to a new teacher — all student data transfers automatically.</div>
            </div>
            {licenses.map(l=>{
              const teacher=teachers.find(t=>t.id===l.assigned_to_teacher_id);
              return(
                <div key={l.id} style={{background:"#fff",borderRadius:14,padding:"14px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:l.status==="active"?"#5AAB2A":"#BDC3C7",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14,color:"#1A1A2E"}}>{teacher?teacher.name:"Unassigned"}</div>
                    <div style={{fontSize:11,color:"#AAA"}}>{teacher?teacher.email:"Available to assign"} · {l.status}</div>
                  </div>
                  {l.assigned_date&&<div style={{fontSize:11,color:"#CCC"}}>Since {new Date(l.assigned_date).toLocaleDateString()}</div>}
                  <button style={{padding:"6px 12px",borderRadius:8,border:"2px solid #0984E3",background:"#fff",color:"#1B65B8",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>
                    {l.status==="active"?"Reassign":"Assign"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function SaySee(){
  const [user,setUser]           = useState(null);
  const [loading,setLoading]     = useState(true);
  const [masterWords,setMasterWords] = useState([...MASTER_WORDS, ...DEV_WORDS]);
  const [homeMode,setHomeMode]   = useState("home");
  const [showTerms,setShowTerms] = useState(false);
  const [termsAccepted,setTermsAccepted] = useState(()=>{
    try{ return localStorage.getItem("saysee_terms_accepted")==="true"; }catch(e){ return false; }
  });

  const ADMIN_EMAILS = ["admin@saysee.app","admin@saysee.io","hello@saysee.io"];

  const checkSession = async () => {
    try {
      try{ if(supabase) await supabase.auth.refreshSession(); }catch(e){}
      const session = await sbAuth.getSession();
      if(session?.user){
        const email = session.user.email||"";
        const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
        let acct = null;
        try{ acct = await sbAuth.getAccount(session.user.id); }catch(e){}
        const userData = acct ? {
          ...acct,
          role: isAdmin?"admin":(acct.role||"teacher"),
          plan: isAdmin?"admin":(acct.plan||"monthly"),
          maxStudents: acct.max_students||28,
          name: acct.name||email,
        } : {
          id:session.user.id, email,
          name:session.user.user_metadata?.name||email,
          role:isAdmin?"admin":"teacher",
          plan:isAdmin?"admin":"monthly",
          maxStudents:28,
        };
        setUser(userData);
        try{ localStorage.setItem("saysee_session",JSON.stringify({user:userData,ts:Date.now()})); }catch(e){}
      } else {
        try{
          const cached = localStorage.getItem("saysee_session");
          if(cached){
            const {user:cu,ts} = JSON.parse(cached);
            const sevenDays = 7*24*60*60*1000;
            if(Date.now()-ts < sevenDays && cu?.email) setUser(cu);
            else localStorage.removeItem("saysee_session");
          }
        }catch(e){}
      }
    } catch(e){
      try{
        const cached = localStorage.getItem("saysee_session");
        if(cached){
          const {user:cu,ts} = JSON.parse(cached);
          if(Date.now()-ts < 7*24*60*60*1000 && cu?.email) setUser(cu);
        }
      }catch(e2){}
    }
    setLoading(false);
  };

  useEffect(()=>{ checkSession(); },[]);

  // Load master words — merge in any new seed words missing from saved list
  useEffect(()=>{
    try{
      const seed = [...MASTER_WORDS, ...DEV_WORDS];
      const saved = localStorage.getItem("saysee_master_words");
      if(saved){
        const w = JSON.parse(saved);
        if(w?.length){
          const ids = new Set(w.map(x=>x.id));
          const merged = [...w, ...seed.filter(s=>!ids.has(s.id))];
          setMasterWords(merged);
          if(merged.length !== w.length){
            try{ localStorage.setItem("saysee_master_words", JSON.stringify(merged)); }catch(e){}
          }
        }
      }
    }catch(e){}
  },[]);

  const login = async (email, password, setErr) => {
    const demo = DEMO_ACCOUNTS.find(a=>a.email===email.toLowerCase()&&a.password===password);
    if(demo){
      setUser(demo);
      try{ localStorage.setItem("saysee_session",JSON.stringify({user:demo,ts:Date.now()})); }catch(e){}
      return;
    }
    try{
      const {user:u} = await sbAuth.signIn(email,password);
      const acct = await sbAuth.getAccount(u.id);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      const loginUser = acct ? {
        ...acct,
        role:isAdmin?"admin":(acct.role||"teacher"),
        plan:isAdmin?"admin":(acct.plan||"monthly"),
        maxStudents:acct.max_students||28,
        name:acct.name||email,
      } : {
        id:u.id, email,
        name:u.user_metadata?.name||email,
        role:isAdmin?"admin":"teacher",
        plan:isAdmin?"admin":"monthly",
        maxStudents:28,
      };
      setUser(loginUser);
      try{ localStorage.setItem("saysee_session",JSON.stringify({user:loginUser,ts:Date.now()})); }catch(e){}
    }catch(err){
      if(setErr) setErr(err.message||"Login failed. Please try again.");
    }
  };

  const register = async (email, password, name, plan, setErr) => {
    try{
      await sbAuth.signUp(email,password,name,plan);
      await login(email,password,setErr);
    }catch(err){
      if(setErr) setErr(err.message||"Registration failed.");
    }
  };

  const logout = async () => {
    try{ localStorage.removeItem("saysee_session"); }catch(e){}
    await sbAuth.signOut();
    setUser(null);
    setHomeMode("home");
  };

  const daysLeftInTrial = (u) => {
    if(!u?.created_at) return 7;
    const days = Math.ceil((new Date(u.created_at).getTime()+7*24*60*60*1000-Date.now())/(1000*60*60*24));
    return Math.max(0,days);
  };

  if(loading) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#1B65B8"}}>
      <div style={{textAlign:"center"}}>
        <div style={{marginBottom:16}}><SaySeeLogo size={60}/></div>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#5AAB2A"}}>Loading SaySee™...</div>
      </div>
    </div>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F4F6FB;}
        input[type="checkbox"]{accent-color:#5AAB2A;cursor:pointer;}
        label{background:none!important;}
        @keyframes popIn   {from{transform:scale(0.75);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes fadeUp  {from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes listenPulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.15);opacity:0.18}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#DDD;border-radius:4px}
      `}</style>
      {!user ? (
        <>
          {showTerms&&<TermsModal onClose={()=>setShowTerms(false)}/>}
          <AuthScreen
            accounts={DEMO_ACCOUNTS}
            onLogin={login}
            onRegister={register}
            termsAccepted={termsAccepted}
            onShowTerms={()=>setShowTerms(true)}
            onAcceptTerms={()=>{
              setTermsAccepted(true);
              try{ localStorage.setItem("saysee_terms_accepted","true"); }catch(e){}
            }}/>
        </>
      ) : user.role==="admin" ? (
        <ErrorBoundary>
          <AdminPanel words={masterWords} setWords={updater=>{
            setMasterWords(prev=>{
              const next = typeof updater === "function" ? updater(prev) : updater;
              try{ localStorage.setItem("saysee_master_words",JSON.stringify(next)); }catch(e){}
              return next;
            });
          }} onLogout={logout} user={user}/>
        </ErrorBoundary>
      ) : homeMode==="home" ? (
        <HomeScreen user={user} onLogout={logout} onMode={setHomeMode}
          daysLeft={daysLeftInTrial(user)}/>
      ) : homeMode==="see" ? (
        <ErrorBoundary>
          <SeeScreen user={user} words={masterWords} onBack={()=>setHomeMode("home")}/>
        </ErrorBoundary>
      ) : homeMode==="teach" ? (
        <ErrorBoundary>
          <TeachScreen user={user} onBack={()=>setHomeMode("home")}
            onManageStudents={()=>setHomeMode("students")}/>
        </ErrorBoundary>
      ) : homeMode==="students" ? (
        <ErrorBoundary>
          <StudentsSection user={user} onBack={()=>setHomeMode("teach")}/>
        </ErrorBoundary>
      ) : homeMode==="data" ? (
        <ErrorBoundary>
          <DataScreen user={user} onBack={()=>setHomeMode("home")}/>
        </ErrorBoundary>
      ) : homeMode==="settings" ? (
        <ErrorBoundary>
          <SettingsScreen user={user} words={masterWords} onBack={()=>setHomeMode("home")}
            onLogout={logout}/>
        </ErrorBoundary>
      ) : homeMode==="reinforcers" ? (
        <ReinforcerSurveyScreen user={user} onBack={()=>setHomeMode("home")} onSave={()=>{}}/>
      ) : (
        // Say tile — straight to AAC listening with autoStart
        <ErrorBoundary>
          <TeacherApp user={user} words={masterWords} onLogout={logout}
            daysLeft={daysLeftInTrial(user)}
            onGoHome={()=>setHomeMode("home")}
            autoStart={true}/>
        </ErrorBoundary>
      )}
    </>
  );
}
