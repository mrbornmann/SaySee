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
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const { data } = await supabase.from('photos')
      .select('word_id, public_url, storage_path')
      .eq('owner_id', userId);
    if(!data || data.length === 0) return {};

    // Generate signed URLs for all photos
    const map = {};
    await Promise.all(data.map(async p => {
      const storagePath = p.storage_path || p.public_url;
      if(!storagePath) return;
      try {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrl(storagePath, 604800); // 1 hour expiry
        if(signed?.signedUrl){
          map[p.word_id] = signed.signedUrl;
        }
      } catch(e) {
        console.log('Signed URL error for', p.word_id, e);
      }
    }));
    return map;
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
  {id:"core",      label:"Core",        icon:"⭐", color:"#1B65B8"},
  {id:"classroom", label:"Classroom",   icon:"🏫", color:"#1B65B8"},
  {id:"library",   label:"Library",     icon:"📚", color:"#8E44AD"},
  {id:"recess",    label:"Recess",      icon:"⚽", color:"#5AAB2A"},
  {id:"lunch",     label:"Lunch",       icon:"🍽️",  color:"#E67E22"},
  {id:"emotions",  label:"Emotions",    icon:"😊", color:"#F1C40F"},
  {id:"actions",   label:"Actions",     icon:"🏃", color:"#1ABC9C"},
  {id:"custom",    label:"My Words",    icon:"✏️",  color:"#95A5A6"},
];

const LEVELS = [
  {id:1,label:"Photo",    icon:"📷"},
  {id:2,label:"Color Art",icon:"🎨"},
  {id:3,label:"B&W Art",  icon:"✏️"},
  {id:4,label:"Word Only",icon:"🔤"},
];

const AVATARS = ["🐱","🐶","🐸","🦊","🐼","🐨","🦁","🐯","🦄","🐙","🦋","🐬","🦉","🐻","🐺"];

const DEMO_ACCOUNTS = [
  // ── SaySee Admin ─────────────────────────────────────────────
  {id:"admin",    email:"admin@saysee.app",      password:"saysee2024!",  name:"SaySee Admin",       role:"admin",          plan:"admin",   maxStudents:999},

  // ── Demo accounts — bypass all trials, always work ───────────
  {id:"demoT",   email:"teacher@saysee.io",      password:"SaySee2026!",  name:"Demo Teacher",       role:"teacher",        plan:"monthly", maxStudents:28},
  {id:"demoD",   email:"district@saysee.io",     password:"SaySee2026!",  name:"Demo District",      role:"district_admin", plan:"school",  maxStudents:999},
  {id:"demoT2",  email:"teacher2@saysee.io",     password:"SaySee2026!",  name:"Demo Teacher 2",     role:"teacher",        plan:"monthly", maxStudents:28},

  // ── Legacy demo ───────────────────────────────────────────────
  {id:"demo",    email:"teacher@demo.com",        password:"demo123",      name:"Ms. Johnson",        role:"teacher",        plan:"monthly", maxStudents:28},
];

// Demo accounts always bypass Supabase and trial checks
const DEMO_EMAILS = new Set(DEMO_ACCOUNTS.map(a=>a.email.toLowerCase()));

// ── IP Notice ────────────────────────────────────────────────────
// © 2026 SaySee LLC. All rights reserved.
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
function FirstThenBoard({firstItem, thenItem}){
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#E3F2FD",borderBottom:"3px solid #1B65B8",padding:16,gap:8}}>
        <div style={{background:"#1B65B8",borderRadius:12,padding:"6px 24px"}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#fff",letterSpacing:2}}>FIRST</div>
        </div>
        {firstItem ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,animation:"popIn 0.4s ease"}}>
            <div style={{fontSize:"min(22vw,22vh)",lineHeight:1}}>{firstItem.emoji}</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(20px,6vw,36px)",color:"#1B65B8"}}>{firstItem.display||firstItem.label}</div>
          </div>
        ):(
          <div style={{opacity:0.35,textAlign:"center"}}>
            <div style={{fontSize:48}}>❓</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#1B65B8",fontWeight:700}}>Say the task after "first"</div>
          </div>
        )}
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#E8F5E9",padding:16,gap:8}}>
        <div style={{background:"#5AAB2A",borderRadius:12,padding:"6px 24px"}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#fff",letterSpacing:2}}>THEN</div>
        </div>
        {thenItem ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,animation:"popIn 0.4s ease"}}>
            <div style={{fontSize:"min(22vw,22vh)",lineHeight:1}}>{thenItem.emoji}</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(20px,6vw,36px)",color:"#5AAB2A"}}>{thenItem.display||thenItem.label}</div>
          </div>
        ):(
          <div style={{opacity:0.35,textAlign:"center"}}>
            <div style={{fontSize:48}}>🌟</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#5AAB2A",fontWeight:700}}>Say "then" + the reward</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Choice Board ──────────────────────────────────────────────────
function ChoiceBoard({items, selected, onSelect, stage}){
  const cols = items.length<=2?2:items.length<=4?2:3;
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",background:"#F3E5F5",padding:16,gap:16}}>
      <div style={{background:stage==="workingfor_pick"?"#F5A623":"#8E44AD",borderRadius:14,padding:"8px 28px",boxShadow:`0 4px 20px ${stage==="workingfor_pick"?"#F5A62344":"#8E44AD44"}`}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#fff",letterSpacing:2}}>
          {stage==="workingfor_pick"?"🌟 What are you working for?":stage==="listening"?"Listening for choices...":"Make a Choice"}
        </div>
      </div>
      {items.length===0?(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,opacity:0.4}}>
          <div style={{fontSize:56}}>🎯</div>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#8E44AD"}}>Say the choices</div>
        </div>
      ):(
        <div style={{flex:1,display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:12,width:"100%",maxWidth:500}}>
          {items.map((item,i)=>(
            <button key={item.id||i} onClick={()=>onSelect(item)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              gap:8,padding:16,borderRadius:20,border:"none",cursor:"pointer",
              background:selected?.id===item.id?(stage==="workingfor_pick"?"#F5A623":"#8E44AD"):"#fff",
              boxShadow:selected?.id===item.id?(stage==="workingfor_pick"?"0 6px 24px #F5A62355":"0 6px 24px #8E44AD55"):"0 3px 12px rgba(0,0,0,0.1)",
              transform:selected?.id===item.id?"scale(1.05)":"scale(1)",
              transition:"all 0.2s",
            }}>
              <div style={{fontSize:"min(14vw,14vh)",lineHeight:1}}>{item.emoji}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(14px,4vw,22px)",color:selected?.id===item.id?"#fff":"#333"}}>
                {(item.display||item.label||item.word||"").toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      )}
      {selected&&(
        <div style={{background:stage==="workingfor_pick"?"#F5A623":"#8E44AD",borderRadius:14,padding:"8px 24px",animation:"popIn 0.4s ease"}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#fff"}}>
            {stage==="workingfor_pick"?"🌟":"✅"} {(selected.display||selected.label||selected.word||"").toUpperCase()}
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
          Thank you for trying SaySee©! Choose a plan to continue supporting your students.
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

// ── Auth screen ───────────────────────────────────────────────
function AuthScreen({accounts,onLogin,onRegister}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [plan,setPlan]=useState("monthly");
  const [err,setErr]=useState("");
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
            {[["Email","email",email,setEmail,"you@school.edu"],["Password","password",pass,setPass,"••••••••"]].map(([l,t,v,s,p])=>(
              <div key={l} style={{marginBottom:13}}><label style={lStyle}>{l}</label><input value={v} onChange={e=>s(e.target.value)} type={t} placeholder={p} style={iStyle}/></div>
            ))}
            {err&&<div style={{color:"#FF7675",fontSize:13,marginBottom:10,fontFamily:"'Nunito',sans-serif"}}>{err}</div>}
            <button onClick={doLogin} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#0984E3,#6C5CE7)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",boxShadow:"0 6px 24px rgba(9,132,227,0.45)",marginBottom:14}}>Sign In</button>
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
function AdminPanel({words,setWords,onLogout}){
  const [tab,setTab]=useState("words");
  const [editW,setEditW]=useState(null);
  const [adminCats,setAdminCats]=useState(mem.get("admin_cats",[...CATS]));
  const [showAdminCat,setShowAdminCat]=useState(false);
  const [addW,setAddW]=useState(false);
  const [cat,setCat]=useState("all");

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
                <span style={{fontSize:28}}>{w.emoji}</span>
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
            <AdminWordForm word={editW} onSave={w=>{setWords(p=>p.map(x=>x.id===w.id?w:x));setEditW(null);}} onDelete={id=>{setWords(p=>p.filter(x=>x.id!==id));setEditW(null);}} onClose={()=>setEditW(null)}/>
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
function TeacherApp({user,words,onLogout,daysLeft=null}){
  // ── In-app Stripe payment ───────────────────────────────────────
  const [showStripeInApp,setShowStripeInApp] = useState(false);
  const [stripeInAppPlan,setStripeInAppPlan] = useState("monthly");

  // ── App Mode ─────────────────────────────────────────────────────
  const [appMode,setAppMode]       = useState("aac"); // aac | workingfor | firstthen | choice
  const [showModeMenu,setShowModeMenu] = useState(false);

  // ── Working For state ─────────────────────────────────────────
  const [workingForItem,setWorkingForItem] = useState(null);
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

  // Praise words that indicate correct response
  const PRAISE = ["good job","great job","nice work","excellent","perfect","yes","good","nice","wonderful","amazing","fantastic","right","correct","good work","well done","that's right","awesome"];

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

  // Log a trial result and check for level advancement
  const logTrial = useCallback((studentId, wordId, correct, responseTime)=>{
    const key = `${studentId}_${wordId}`;
    if(!trialRef.current[key]){
      trialRef.current[key] = { correct:0, incorrect:0, level:1, streak:0 };
    }
    const trial = trialRef.current[key];
    const currentLevel = trial.level;

    if(correct){
      trial.correct++;
      trial.streak = (trial.streak||0) + 1;
      // Advance level after 3 consecutive correct responses
      if(trial.streak >= 3 && trial.level < 4){
        trial.level++;
        trial.streak = 0;
        setAiStatus(`✨ ${students.find(s=>s.id===studentId)?.name} advanced to Level ${trial.level} on "${wordId}"!`);
        setTimeout(()=>setAiStatus(""),4000);
      }
    } else {
      trial.incorrect++;
      trial.streak = 0;
      // Drop level if 2 incorrect in a row
      if(trial.incorrect >= 2 && trial.level > 1){
        trial.level--;
        trial.incorrect = 0;
        setAiStatus(`↩️ Adjusting to Level ${trial.level} for better support`);
        setTimeout(()=>setAiStatus(""),3000);
      }
    }

    // Log to session trail
    setTrialLog(prev=>[...prev,{
      studentId, wordId, correct, responseTime,
      level: currentLevel, timestamp: new Date().toISOString()
    }]);

    saveTrials();
    // Also persist to Supabase asynchronously
    const trialData = trialRef.current[`${studentId}_${wordId}`];
    if(trialData && supabase){
      sbAuth.saveProgress(studentId, wordId, trialData.level, trialData.correct, trialData.incorrect, user.id)
        .catch(e=>console.log("Progress save error:", e));
    }
  },[students, saveTrials, user.id]);

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

  useEffect(()=>{wRef.current=allWords;},[allWords]);
  useEffect(()=>{ studentsRef.current = students; },[students]);
  useEffect(()=>{ activeIdRef.current = activeId; },[activeId]);
  useEffect(()=>{ aiModeRef.current = aiMode; },[aiMode]);
  const appModeRef = useRef("aac");
  const choiceStageRef = useRef("idle");
  useEffect(()=>{ appModeRef.current = appMode; },[appMode]);
  useEffect(()=>{ choiceStageRef.current = choiceStage; },[choiceStage]);

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
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      setMicError("Needs Chrome or Edge browser for voice recognition.");
      return;
    }
    if(recRef.current){ lisRef.current=false; try{recRef.current.stop();}catch{} recRef.current=null; }
    try{
      const rec=new SR();
      rec.continuous=true; rec.interimResults=true; rec.lang="en-US";
      rec.onstart=()=>{ setListening(true); setMicError(""); };
      rec.onresult=(e)=>{
        for(let i=e.resultIndex;i<e.results.length;i++){
          const t=e.results[i][0].transcript.toLowerCase().trim();
          if(e.results[i].isFinal){
            setTrans(t);

            // ── 1. Check for student name — auto-switch profile ──
            const studentMatch = studentsRef.current.find(s=>
              t.includes(s.name.split(" ")[0].toLowerCase())
            );
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
            const firstPhrases = ["first","first you need to","first we","first let's"];
            const thenPhrases  = ["then","then you get","then you can","and then"];
            if(firstPhrases.some(p=>t.startsWith(p)) || t==="first"){
              setAppMode("firstthen");
              setFirstThenStage("first");
              // Listen for task after "first"
              const afterFirst = t.replace(/^first\s*/i,"").trim();
              if(afterFirst.length > 1){
                const taskMatch = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>afterFirst.includes(tr)));
                if(taskMatch) setFirstItem(taskMatch);
              }
              return;
            }
            if((thenPhrases.some(p=>t.startsWith(p)) || t==="then") && appModeRef.current==="firstthen"){
              setFirstThenStage("then");
              const afterThen = t.replace(/^then\s*/i,"").trim();
              if(afterThen.length > 1){
                // Check reinforcers first
                const rMatch = REINFORCERS.find(r=>afterThen.includes(r.label.toLowerCase())||afterThen.includes(r.id));
                if(rMatch){ setThenItem({...rMatch, isThenReinforcer:true}); setFirstThenStage("complete"); }
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
                setChoiceItems(prev=>{
                  if(prev.length >= 6) return prev;
                  if(prev.find(c=>c.id===newChoice.id)) return prev;
                  const updated = [...prev, newChoice];
                  if(updated.length >= 2) setChoiceStage("display");
                  return updated;
                });
              }
              return;
            }

            // ── 2. Check for praise — log correct response ──
            const isPraise = PRAISE.some(p=>t.includes(p));
            if(isPraise && lastInstructionRef.current && timerStartRef.current){
              const responseTime = Date.now() - timerStartRef.current;
              const activeStudent = activeIdRef.current;
              if(activeStudent && lastInstructionRef.current){
                logTrial(activeStudent, lastInstructionRef.current.id, true, responseTime);
                // Update display level for active student
                const newLevel = getStudentWordLevel(activeStudent, lastInstructionRef.current.id);
                setLevel(newLevel);
              }
              timerStartRef.current = null;
              lastInstructionRef.current = null;
              clearInterval(timerRef.current);
              setResponseTimer(null);
            }

            // ── 3. Direct word match ──
            // Word boundary matching - prevents "go" matching inside "good job", "going" etc.
            const matchesTrigger = (transcript, trigger) => {
              if(trigger.length <= 3) {
                // Short words need word boundary - must be whole word
                const regex = new RegExp(`\\b${trigger}\\b`, 'i');
                return regex.test(transcript);
              }
              return transcript.includes(trigger);
            };
            const directMatch = wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>matchesTrigger(t,tr)));
            if(directMatch){
              setCurWord(directMatch);
              setFlash(true);
              setTimeout(()=>setFlash(false),700);
              lastInstructionRef.current = directMatch;
              timerStartRef.current = Date.now();
              // Start response timer
              clearInterval(timerRef.current);
              timerRef.current = setInterval(()=>{
                setResponseTimer(Date.now() - timerStartRef.current);
              },100);
              // Set level based on student's learned level for this word
              if(activeIdRef.current && aiModeRef.current){
                const wordLevel = getStudentWordLevel(activeIdRef.current, directMatch.id);
                setLevel(wordLevel);
              }
            } else if(t.length > 3 && aiModeRef.current){
              // ── 4. No direct match — try semantic matching ──
              trackUnmatched(t);
              semanticMatch(t, wRef.current).then(semanticWord=>{
                if(semanticWord){
                  setCurWord(semanticWord);
                  setFlash(true);
                  setTimeout(()=>setFlash(false),700);
                  lastInstructionRef.current = semanticWord;
                  timerStartRef.current = Date.now();
                  if(activeIdRef.current){
                    const wordLevel = getStudentWordLevel(activeIdRef.current, semanticWord.id);
                    setLevel(wordLevel);
                  }
                }
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
  },[]);

  useEffect(()=>{ return()=>{ lisRef.current=false; try{recRef.current?.stop();}catch{}; }; },[]);

  const markLearned=(wid)=>{
    if(!activeId)return;
    setStudents(p=>p.map(s=>s.id===activeId?{...s,progress:{...s.progress,[wid]:true}}:s));
  };

  const handlePhotoSaved=async (wordId, dataUrl)=>{
    // Save locally immediately for instant display
    setPhotos(p=>({...p,[wordId]:dataUrl}));
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

  if(stuMode) return <StudentMode entry={curWord} level={level} listening={listening} transcript={transcript} onExit={()=>setStuMode(false)}/>;

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
                <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#5AAB2A,#3d8a1e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 4px 20px #5AAB2A55",zIndex:1}}>🎤</div>
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

        {/* Manual override buttons */}
        {curWord&&aiMode&&<div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#AAA",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Override:</div>
          <button onClick={()=>{if(!activeId)return;logTrial(activeId,curWord.id,true,0);setLevel(getStudentWordLevel(activeId,curWord.id));}} style={{padding:"7px 16px",borderRadius:30,border:"none",background:"#5AAB2A",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 2px 10px #5AAB2A55"}}>✅ Correct</button>
          <button onClick={()=>{if(!activeId)return;logTrial(activeId,curWord.id,false,0);setLevel(getStudentWordLevel(activeId,curWord.id));}} style={{padding:"7px 16px",borderRadius:30,border:"none",background:"#E74C3C",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 2px 10px #E74C3C55"}}>↩️ No Response</button>
        </div>}

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
  const [masterWords,setMasterWords] = useState([...MASTER_WORDS]);
  const [showPayment,setShowPayment]   = useState(false);
  const [paymentPlan,setPaymentPlan]   = useState('monthly');

  // Check for existing session on load
  useEffect(()=>{
    const checkSession = async () => {
      try {
        const session = await sbAuth.getSession();
        if (session) {
          const acct = await sbAuth.getAccount(session.user.id);
          if (acct) setUser(acct);
          else setUser({ id:session.user.id, email:session.user.email, name:session.user.user_metadata?.name||session.user.email, role:session.user.user_metadata?.role||"teacher", plan:session.user.user_metadata?.plan||"monthly", maxStudents:28 });
        }
      } catch(e) { console.log("Session check failed - using demo mode"); }
      setLoading(false);
    };
    checkSession();
  },[]);

  // Load master words from Supabase if available
  useEffect(()=>{
    const loadWords = async () => {
      try {
        const words = await sbData.getWords();
        if (words.length > 0) setMasterWords(words.map(w=>({...w, cat:w.category, triggers:w.triggers||[w.word]})));
      } catch(e) { console.log("Using built-in word list"); }
    };
    loadWords();
  },[]);

  // ── Trial enforcement helpers ────────────────────────────────
  const isTrialExpired = (acct) => {
    if(!acct) return false;
    // Never block admins, paid plans, or demo accounts
    if(acct.role === 'admin' || acct.role === 'district_admin') return false;
    if(acct.plan !== 'trial') return false;
    if(DEMO_EMAILS.has(acct.email?.toLowerCase())) return false;
    if(!acct.trialStart) return false;
    const trialStart = new Date(acct.trialStart);
    if(isNaN(trialStart.getTime())) return false;
    const daysDiff = (Date.now() - trialStart) / (1000 * 60 * 60 * 24);
    return daysDiff > 7;
  };

  const daysLeftInTrial = (acct) => {
    if(!acct?.trialStart) return 7;
    const trialStart = new Date(acct.trialStart);
    const now = new Date();
    const daysDiff = (now - trialStart) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - daysDiff));
  };

  // Admin emails always get admin role regardless of database state
  const ADMIN_EMAILS = ['admin@saysee.app', 'admin@saysee.io', 'hello@saysee.io'];

  const login = async (email, password, setErr) => {
    // ── Check demo accounts first — always work, bypass Supabase ──
    const demo = DEMO_ACCOUNTS.find(a=>a.email===email.toLowerCase()&&a.password===password);
    if(demo){ setUser(demo); return; }

    // ── Try Supabase for real accounts ─────────────────────────────
    try {
      const { user:u } = await sbAuth.signIn(email, password);
      const acct = await sbAuth.getAccount(u.id);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      if(acct) {
        setUser({
          ...acct,
          role:       isAdmin ? 'admin'   : (acct.role   || 'teacher'),
          plan:       isAdmin ? 'admin'   : (acct.plan   || 'monthly'),
          maxStudents: acct.max_students  || 28,
          name:       acct.name           || email,
        });
      } else {
        setUser({
          id: u.id, email: u.email,
          name: u.user_metadata?.name || email,
          role: isAdmin ? 'admin'  : (u.user_metadata?.role || 'teacher'),
          plan: isAdmin ? 'admin'  : 'monthly',
          maxStudents: 28,
        });
      }
    } catch(e) {
      setErr(e.message||"Invalid email or password.");
    }
  };

  const logout = async () => { await sbAuth.signOut(); setUser(null); };

  const register = async (name, email, password, plan, setErr) => {
    try {
      const trialStart = new Date().toISOString();
      await sbAuth.signUp(email, password, name, plan);
      setUser({ id:`u_${Date.now()}`, email, name, role:"teacher", plan:"trial", trialStart, maxStudents:28 });
    } catch(e) { setErr(e.message||"Registration failed. Please try again."); }
  };

  if (loading) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1B4F9E,#2B6CB0)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <SaySeeFullLogo size={120}/>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"rgba(255,255,255,0.5)"}}>Loading…</div>
    </div>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F4F6FB;}
        @keyframes popIn   {from{transform:scale(0.75);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes fadeUp  {from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideR  {from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes micGlow {0%,100%{box-shadow:0 0 0 4px #2ECC7133}50%{box-shadow:0 0 0 11px #2ECC7115}}
        @keyframes mPulse  {0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(1.7)}}
        @keyframes listenPulse {0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.15);opacity:0.18}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#DDD;border-radius:4px}
      `}</style>
      {!user
        ?<AuthScreen onLogin={login} onRegister={register}/>
        :user.role==="admin"
          ?<ErrorBoundary><AdminPanel words={masterWords} setWords={setMasterWords} onLogout={logout}/></ErrorBoundary>
          :user.role==="district_admin"
            ?<ErrorBoundary><DistrictAdminPanel user={user} onLogout={logout}/></ErrorBoundary>
            :isTrialExpired(user)
              ?<>
                <TrialExpiredScreen user={user} onLogout={logout} setShowPayment={setShowPayment} setPaymentPlan={setPaymentPlan}/>
                {showPayment&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
                    <PaymentForm
                      user={user}
                      plan={paymentPlan}
                      onSuccess={plan=>{
                        setUser(u=>({...u,plan}));
                        setShowPayment(false);
                      }}
                      onCancel={()=>setShowPayment(false)}
                    />
                  </div>
                )}
              </>
              :<ErrorBoundary><TeacherApp user={user} words={masterWords} onLogout={logout} daysLeft={daysLeftInTrial(user)}/></ErrorBoundary>
      }
    </>
  );
}
