import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
    getDatabase, ref, set, get, onValue, update 
} from 'firebase/database';
import confetti from 'canvas-confetti';

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDL6yuft4kzYubNsGqVDUOcDr-3gyHu4ys",
  authDomain: "sa-math.firebaseapp.com",
  databaseURL: "https://sa-math-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sa-math",
  storageBucket: "sa-math.firebasestorage.app",
  messagingSenderId: "899021994243",
  appId: "1:899021994243:web:4aed548957fce530989136",
  measurementId: "G-0W2Z7V8SJ7"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

// ==========================================
// 2. MAIN APP COMPONENT
// ==========================================
export default function MathGameApp() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [view, setView] = useState('login'); 
    const [isLandscape, setIsLandscape] = useState(true);
    
    // Game State
    const [selectedMap, setSelectedMap] = useState(1);
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [levelData, setLevelData] = useState(null);
    const [allLevels, setAllLevels] = useState({});
    const [userProgress, setUserProgress] = useState({});
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userRef = ref(db, `users/${currentUser.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setUserData(snapshot.val());
                } else {
                    const role = currentUser.email === 'admin@math.com' ? 'admin' : 'player';
                    const newUserData = { 
                        email: currentUser.email, 
                        totalStars: 0, 
                        role: role,
                        displayName: currentUser.email.split('@')[0]
                    };
                    await set(userRef, newUserData);
                    setUserData(newUserData);
                }
                setView('menu');
            } else {
                setView('login');
                setUserData(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const levelsRef = ref(db, 'levels');
        const unsubLevels = onValue(levelsRef, (snapshot) => {
            if (snapshot.exists()) setAllLevels(snapshot.val());
            else setAllLevels({});
        });

        const progressRef = ref(db, `users/${user.uid}/progress`);
        const unsubProgress = onValue(progressRef, (snapshot) => {
            if (snapshot.exists()) setUserProgress(snapshot.val());
            else setUserProgress({});
        });

        const usersRef = ref(db, 'users');
        const unsubLeaderboard = onValue(usersRef, (snapshot) => {
            let usersList = [];
            if (snapshot.exists()) {
                const data = snapshot.val();
                for (let uid in data) {
                    if (data[uid].totalStars > 0) usersList.push({ id: uid, ...data[uid] });
                }
                usersList.sort((a, b) => b.totalStars - a.totalStars);
            }
            setLeaderboard(usersList);
        });

        return () => { unsubLevels(); unsubProgress(); unsubLeaderboard(); };
    }, [user]);

    const handleSignOut = () => signOut(auth);

    const saveProgress = async (mapId, levelId, starsEarned) => {
        if (!user || !userData) return;
        const levelKey = `map${mapId}_level${levelId}`;
        const previousStars = userProgress[levelKey]?.stars || 0;
        
        if (starsEarned > previousStars) {
            const progressRef = ref(db, `users/${user.uid}/progress/${levelKey}`);
            await set(progressRef, { stars: starsEarned, mapId, levelId });
            
            const starDifference = starsEarned - previousStars;
            const userRef = ref(db, `users/${user.uid}`);
            await update(userRef, { totalStars: userData.totalStars + starDifference });
        }
    };

    if (!isLandscape) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-800 to-purple-900 text-center p-6 text-white font-['Kanit']">
                <i className="fas fa-mobile-alt text-7xl md:text-9xl mb-4 md:mb-6 animate-bounce text-yellow-400"></i>
                <h1 className="text-3xl md:text-5xl font-black mb-2 md:mb-4 drop-shadow-lg">หมุนจอหน่อยครับ!</h1>
                <p className="text-lg md:text-2xl opacity-90 bg-black/30 px-6 py-2 rounded-full">ตะแคงโทรศัพท์เป็นแนวนอนเพื่อเข้าสู่เกม</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#a8edea] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] font-['Kanit'] overflow-hidden relative selection:bg-blue-300">
            {/* Game-like Top Bar for User Info */}
            {user && view !== 'play' && view !== 'sandbox' && (
                <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center gap-2 md:gap-4 bg-white/90 backdrop-blur-md px-3 py-1.5 md:px-5 md:py-2.5 rounded-full shadow-[0_4px_0_rgba(0,0,0,0.1)] border-2 border-white z-50 transform transition hover:scale-105">
                    <div className="text-sm md:text-xl font-black text-gray-800 flex items-center bg-yellow-100 px-3 py-1 rounded-full shadow-inner">
                        <i className="fas fa-star text-yellow-500 mr-1 md:mr-2 drop-shadow-sm"></i> {userData?.totalStars || 0}
                    </div>
                    <div className="text-xs md:text-base text-gray-700 font-bold flex items-center pl-2 md:pl-4 border-l-2 border-gray-200">
                        <i className="fas fa-user-astronaut text-blue-500 mr-1 md:mr-2 text-lg"></i> {userData?.displayName}
                    </div>
                    <button onClick={handleSignOut} className="text-white text-xs md:text-sm ml-1 md:ml-2 bg-red-500 hover:bg-red-600 px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-[0_2px_0_#b91c1c] active:translate-y-[2px] active:shadow-none transition-all">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            )}

            {view === 'login' && <LoginScreen />}
            {view === 'menu' && <MainMenu setView={setView} isAdmin={userData?.role === 'admin'} />}
            {view === 'mapSelect' && <MapSelect setView={setView} setSelectedMap={setSelectedMap} userProgress={userProgress} />}
            {view === 'levelSelect' && <LevelSelect setView={setView} mapId={selectedMap} setSelectedLevel={setSelectedLevel} setLevelData={setLevelData} allLevels={allLevels} userProgress={userProgress} />}
            {view === 'admin' && <AdminPanel setView={setView} allLevels={allLevels} />}
            {view === 'leaderboard' && <Leaderboard setView={setView} leaderboard={leaderboard} />}
            
            {(view === 'play' || view === 'sandbox') && (
                <GameEngine 
                    view={view} 
                    setView={setView} 
                    levelData={view === 'play' ? levelData : null} 
                    mapId={selectedMap}
                    levelId={selectedLevel}
                    setSelectedLevel={setSelectedLevel}
                    setLevelData={setLevelData}
                    allLevels={allLevels}
                    saveProgress={saveProgress}
                />
            )}
        </div>
    );
}

// ==========================================
// UI COMPONENTS
// ==========================================
function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) { setError('ข้อมูลไม่ถูกต้อง หรือรหัสผ่านสั้นไปครับ'); }
    };

    return (
        <div className="flex h-screen items-center justify-center p-2 md:p-4 bg-gradient-to-br from-blue-400/50 to-purple-500/50">
            <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-[0_10px_0_rgba(0,0,0,0.1)] border-4 border-white max-w-sm w-full text-center relative overflow-hidden transform transition-all hover:scale-[1.02]">
                <div className="text-5xl md:text-6xl mb-3 text-blue-500 drop-shadow-md"><i className="fas fa-gamepad"></i></div>
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-1">สมาร์ทแมท AI</h1>
                <h2 className="text-xs md:text-sm text-gray-500 font-bold mb-6 bg-gray-100 inline-block px-4 py-1 rounded-full">โดย ครูจักรวรรดิ ไชยโคตร</h2>
                
                {error && <div className="bg-red-500 text-white p-2 rounded-xl mb-3 text-xs md:text-sm font-bold animate-bounce shadow-md">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                    <div className="relative">
                        <i className="fas fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="email" placeholder="อีเมลของคุณ" required value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-blue-400 outline-none text-sm md:text-base font-medium transition-colors" />
                    </div>
                    <div className="relative">
                        <i className="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-blue-400 outline-none text-sm md:text-base font-medium transition-colors" />
                    </div>
                    <button type="submit" className="bg-gradient-to-b from-blue-400 to-blue-600 text-white font-black py-3 rounded-2xl shadow-[0_6px_0_#1e3a8a] active:translate-y-[6px] active:shadow-none text-lg transition-all mt-2 uppercase tracking-wide">
                        {isLogin ? 'เข้าสู่ระบบ ลุย!' : 'สร้างบัญชีใหม่!'}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-6 text-sm text-gray-500 font-bold hover:text-blue-600 transition-colors underline decoration-2 underline-offset-4">
                    {isLogin ? 'ผู้เล่นใหม่? สมัครตรงนี้' : 'มีบัญชีแล้ว? เข้าเกมเลย'}
                </button>
            </div>
        </div>
    );
}

function MainMenu({ setView, isAdmin }) {
    return (
        <div className="flex h-screen items-center justify-center p-2 md:p-6">
            <div className="w-full max-w-4xl text-center">
                <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] mb-8 md:mb-12" style={{ WebkitTextStroke: '2px #1e3a8a' }}>
                    เลือกโหมดการเล่น
                </h1>
                <div className="grid grid-cols-2 gap-4 md:gap-8 px-4">
                    <MenuButton icon="fa-map-marked-alt" text="ลุยด่าน (Play)" color="from-green-400 to-green-600" shadowColor="#166534" onClick={() => setView('mapSelect')} />
                    <MenuButton icon="fa-flask" text="ฝึกฝน (Sandbox)" color="from-orange-400 to-orange-600" shadowColor="#9a3412" onClick={() => setView('sandbox')} />
                    <MenuButton icon="fa-trophy" text="ตารางอันดับ" color="from-yellow-300 to-yellow-500" shadowColor="#a16207" textColor="text-yellow-900" onClick={() => setView('leaderboard')} colSpan={isAdmin ? 1 : 2} />
                    {isAdmin && <MenuButton icon="fa-cogs" text="จัดการด่าน" color="from-gray-500 to-gray-700" shadowColor="#374151" onClick={() => setView('admin')} />}
                </div>
            </div>
        </div>
    );
}

function MenuButton({ icon, text, color, shadowColor, textColor = "text-white", onClick, colSpan = 1 }) {
    return (
        <button onClick={onClick} className={`bg-gradient-to-b ${color} ${textColor} font-black py-6 px-2 md:py-10 md:px-4 rounded-[2rem] shadow-[0_8px_0_${shadowColor}] transform transition-all active:translate-y-[8px] active:shadow-none text-xl md:text-3xl flex flex-col items-center justify-center gap-2 md:gap-4 col-span-${colSpan} border-4 border-white/30 hover:brightness-110`}>
            <i className={`fas ${icon} text-4xl md:text-6xl drop-shadow-md`}></i> 
            <span className="tracking-wide drop-shadow-sm">{text}</span>
        </button>
    );
}

function MapSelect({ setView, setSelectedMap, userProgress }) {
    const maps = Array.from({ length: 10 }, (_, i) => i + 1);
    const isMapUnlocked = (m) => m === 1 || (userProgress[`map${m - 1}_level10`]?.stars || 0) > 0;

    return (
        <div className="p-4 md:p-8 h-screen overflow-y-auto relative">
            <button onClick={() => setView('menu')} className="absolute top-4 left-4 md:top-8 md:left-8 bg-white text-blue-600 px-4 py-2 md:px-6 md:py-3 rounded-full font-black shadow-[0_4px_0_#93c5fd] active:translate-y-[4px] active:shadow-none transition-all text-sm md:text-lg border-2 border-blue-200 z-10"><i className="fas fa-chevron-left mr-2"></i> กลับ</button>
            
            <div className="mt-14 md:mt-4 mb-8 md:mb-12 text-center">
                <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] inline-block px-10 py-3 bg-blue-500 rounded-full border-4 border-white" style={{ WebkitTextStroke: '1.5px #1e3a8a' }}>เลือกแผนที่</h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto pb-10 px-2">
                {maps.map(mapNum => {
                    const unlocked = isMapUnlocked(mapNum);
                    return (
                        <button key={mapNum} disabled={!unlocked} onClick={() => { setSelectedMap(mapNum); setView('levelSelect'); }}
                            className={`relative flex flex-col items-center justify-center h-28 md:h-40 rounded-[2rem] border-4 transition-all ${unlocked ? 'bg-gradient-to-b from-blue-100 to-white border-blue-400 shadow-[0_6px_0_#60a5fa] active:translate-y-[6px] active:shadow-none cursor-pointer hover:border-blue-500' : 'bg-gray-200 border-gray-300 shadow-[0_6px_0_#d1d5db] opacity-80 cursor-not-allowed'}`}>
                            <span className={`text-sm md:text-xl font-bold ${unlocked ? 'text-blue-500' : 'text-gray-400'} uppercase tracking-widest mb-1`}>Map</span>
                            <span className={`text-4xl md:text-6xl font-black ${unlocked ? 'text-blue-700 drop-shadow-sm' : 'text-gray-400'}`}>{mapNum}</span>
                            {!unlocked && <div className="absolute inset-0 bg-black/5 rounded-[1.75rem] flex items-center justify-center"><i className="fas fa-lock text-gray-500/50 text-3xl md:text-5xl"></i></div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

function LevelSelect({ setView, mapId, setSelectedLevel, setLevelData, allLevels, userProgress }) {
    const levels = Array.from({ length: 10 }, (_, i) => i + 1);
    const isLevelUnlocked = (l) => l === 1 || (userProgress[`map${mapId}_level${l - 1}`]?.stars || 0) > 0;

    return (
        <div className="p-4 md:p-8 h-screen overflow-y-auto relative">
            <button onClick={() => setView('mapSelect')} className="absolute top-4 left-4 md:top-8 md:left-8 bg-white text-green-600 px-4 py-2 md:px-6 md:py-3 rounded-full font-black shadow-[0_4px_0_#86efac] active:translate-y-[4px] active:shadow-none transition-all text-sm md:text-lg border-2 border-green-200 z-10"><i className="fas fa-chevron-left mr-2"></i> แผนที่</button>
            
            <div className="mt-14 md:mt-4 mb-8 md:mb-12 text-center">
                <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] inline-block px-10 py-3 bg-green-500 rounded-full border-4 border-white" style={{ WebkitTextStroke: '1.5px #14532d' }}>MAP {mapId}</h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto pb-10 px-2">
                {levels.map(lvlNum => {
                    const levelKey = `map${mapId}_level${lvlNum}`;
                    const levelExists = allLevels[levelKey];
                    const unlocked = isLevelUnlocked(lvlNum) && levelExists;
                    const stars = userProgress[levelKey]?.stars || 0;
                    return (
                        <button key={lvlNum} disabled={!unlocked && levelExists} onClick={() => { if(levelExists) { setSelectedLevel(lvlNum); setLevelData(allLevels[levelKey]); setView('play'); } else alert("คุณครูกำลังสร้างด่านนี้อยู่ครับ รอแป๊บนึงนะ!"); }}
                            className={`relative flex flex-col items-center justify-center h-28 md:h-40 rounded-[2rem] border-4 transition-all ${unlocked ? 'bg-gradient-to-b from-green-50 to-white border-green-400 shadow-[0_6px_0_#4ade80] active:translate-y-[6px] active:shadow-none cursor-pointer hover:border-green-500' : (!levelExists ? 'bg-red-50 border-red-200 shadow-[0_6px_0_#fecaca]' : 'bg-gray-200 border-gray-300 shadow-[0_6px_0_#d1d5db] opacity-90 cursor-not-allowed')}`}>
                            <span className={`text-4xl md:text-6xl font-black ${unlocked ? 'text-green-600 drop-shadow-sm' : 'text-gray-400'}`}>{lvlNum}</span>
                            
                            <div className="flex gap-1 md:gap-1.5 mt-2 md:mt-3 bg-gray-800/10 px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-inner">
                                {[1,2,3,4,5].map(star => <i key={star} className={`fas fa-star text-[10px] md:text-sm ${star <= stars ? 'text-yellow-400 drop-shadow' : 'text-gray-300/50'}`}></i>)}
                            </div>
                            
                            {!unlocked && levelExists && <div className="absolute inset-0 flex items-center justify-center bg-gray-800/10 rounded-[1.75rem]"><i className="fas fa-lock text-gray-500/70 text-3xl md:text-5xl"></i></div>}
                            {!levelExists && <div className="absolute bottom-2 text-[10px] md:text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full uppercase tracking-wider">Coming Soon</div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

// ==========================================
// VISUAL EDITOR (For Admin & Sandbox)
// ==========================================
function VisualEditor({ id, label, value, onChange }) {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const updateReactState = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertHTML = (htmlString) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        let sel = window.getSelection();
        if (sel.rangeCount > 0) {
            let range = sel.getRangeAt(0);
            if (el.contains(range.commonAncestorContainer)) {
                let fragment = range.createContextualFragment(htmlString);
                range.deleteContents();
                let lastNode = fragment.lastChild;
                range.insertNode(fragment);
                if (lastNode) {
                    range.setStartAfter(lastNode);
                    range.setEndAfter(lastNode);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } else el.insertAdjacentHTML('beforeend', htmlString);
        } else el.insertAdjacentHTML('beforeend', htmlString);
        updateReactState();
    };

    const insertFraction = (e) => {
        e.preventDefault();
        insertHTML(`<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true"></span><div class="frac-line"></div><span class="frac-den" contenteditable="true"></span></span>&nbsp;`);
    };

    const insertText = (e, text) => { e.preventDefault(); insertHTML(text); };
    const clearEditor = (e) => { e.preventDefault(); if(editorRef.current) { editorRef.current.innerHTML = ''; updateReactState(); } };

    return (
        <div className="flex flex-col gap-2 w-full">
            <style>{`
                .visual-editor-content .editor-fraction { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 4px; background: #f0f9ff; border-radius: 8px; padding: 4px; border: 2px dashed #bae6fd; user-select: none; }
                .visual-editor-content .frac-num, .visual-editor-content .frac-den { min-width: 30px; min-height: 30px; text-align: center; outline: none; padding: 2px 6px; background: white; border-radius: 6px; border: 2px solid #cbd5e1; font-weight: bold; color: #1e3a8a; }
                .visual-editor-content .frac-num:focus, .visual-editor-content .frac-den:focus { border-color: #3b82f6; background: #eff6ff; }
                .visual-editor-content .frac-num:empty::before, .visual-editor-content .frac-den:empty::before { content: '□'; color: #94a3b8; font-weight: normal; }
                .visual-editor-content .frac-line { width: 100%; height: 3px; background-color: #3b82f6; margin: 4px 0; border-radius: 2px; }
            `}</style>
            
            <div className="flex justify-center gap-1.5 md:gap-2 flex-wrap bg-white p-2 rounded-2xl border-2 border-gray-200 shadow-sm">
                <button onMouseDown={insertFraction} onTouchStart={insertFraction} className="bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl px-2 py-1.5 md:px-3 md:py-2 font-bold text-xs md:text-sm active:translate-y-1 transition-all flex items-center whitespace-nowrap"><i className="fas fa-columns rotate-90 mr-1.5"></i>เศษส่วน</button>
                <button onMouseDown={e=>insertText(e,'•')} onTouchStart={e=>insertText(e,'•')} className="bg-purple-50 border-2 border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl px-2 py-1.5 md:px-3 md:py-2 font-bold text-xs md:text-sm active:translate-y-1 transition-all flex items-center whitespace-nowrap"><i className="fas fa-circle text-[8px] mr-1.5"></i>คูณ(•)</button>
                <button onMouseDown={e=>insertText(e,'x')} onTouchStart={e=>insertText(e,'x')} className="bg-green-50 border-2 border-green-200 text-green-700 hover:bg-green-100 rounded-xl px-2 py-1.5 md:px-3 md:py-2 font-black text-xs md:text-sm active:translate-y-1 transition-all whitespace-nowrap">ตัวแปร x</button>
                <button onMouseDown={e=>insertText(e,'+')} onTouchStart={e=>insertText(e,'+')} className="bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200 rounded-xl px-3 py-1.5 md:px-4 md:py-2 font-black text-xs md:text-sm active:translate-y-1 transition-all">+</button>
                <button onMouseDown={e=>insertText(e,'-')} onTouchStart={e=>insertText(e,'-')} className="bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200 rounded-xl px-3 py-1.5 md:px-4 md:py-2 font-black text-xs md:text-sm active:translate-y-1 transition-all">-</button>
                <button onMouseDown={clearEditor} onTouchStart={clearEditor} className="bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 rounded-xl px-2 py-1.5 md:px-3 md:py-2 font-bold text-xs md:text-sm active:translate-y-1 transition-all flex items-center whitespace-nowrap"><i className="fas fa-trash-alt mr-1.5"></i>ล้าง</button>
            </div>
            
            <div className="w-full relative">
                <label className="absolute -top-3 left-4 bg-[#a8edea] px-2 text-gray-600 font-black text-xs md:text-sm z-10">{label}</label>
                <div 
                    id={id}
                    ref={editorRef}
                    className="visual-editor-content bg-white border-4 border-white/80 rounded-2xl p-4 flex items-center min-h-[70px] font-['Fredoka'] text-2xl md:text-3xl color-gray-800 overflow-x-auto whitespace-nowrap cursor-text outline-none focus:border-blue-400 transition-colors w-full shadow-inner"
                    contentEditable="true"
                    onInput={updateReactState}
                    onBlur={updateReactState}
                    suppressContentEditableWarning={true}
                ></div>
            </div>
        </div>
    );
}

// ==========================================
// ADMIN PANEL (Game UI Design)
// ==========================================
function AdminPanel({ setView, allLevels }) {
    const [mapId, setMapId] = useState(1);
    const [levelId, setLevelId] = useState(1);
    const [lhsHtml, setLhsHtml] = useState('');
    const [rhsHtml, setRhsHtml] = useState('');
    const [parMoves, setParMoves] = useState(3);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const levelKey = `map${mapId}_level${levelId}`;
        const data = allLevels[levelKey];
        if (data) {
            setLhsHtml(data.lhsHtml || ''); setRhsHtml(data.rhsHtml || ''); setParMoves(data.parMoves || 3);
        } else {
            setLhsHtml(''); setRhsHtml(''); setParMoves(3);
        }
        setMessage('');
    }, [mapId, levelId, allLevels]);

    const handleSave = async () => {
        if (!lhsHtml || !rhsHtml) { setMessage('กรุณาสร้างสมการให้ครบครับ'); return; }
        const levelKey = `map${mapId}_level${levelId}`;
        await set(ref(db, `levels/${levelKey}`), { mapId, levelId, lhsHtml, rhsHtml, parMoves: parseInt(parMoves) });
        setMessage(`บันทึก Map ${mapId} เลเวล ${levelId} เรียบร้อย!`);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="p-4 md:p-8 h-screen overflow-y-auto relative bg-gradient-to-br from-blue-50 to-indigo-100">
            <button onClick={() => setView('menu')} className="absolute top-4 left-4 bg-white text-gray-700 px-5 py-2.5 rounded-full font-black shadow-[0_4px_0_#d1d5db] active:translate-y-[4px] active:shadow-none transition-all border-2 border-gray-200 z-10 hover:bg-gray-50"><i className="fas fa-chevron-left mr-2"></i> กลับเมนู</button>
            
            <div className="bg-white/95 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.1)] border-4 border-white w-full max-w-5xl mx-auto mt-14 md:mt-4">
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-black text-white inline-block bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-3 rounded-full shadow-[0_6px_0_#1e3a8a] border-4 border-white transform -rotate-1 tracking-wide"><i className="fas fa-tools text-yellow-300 mr-3"></i>จัดการด่าน (Admin)</h1>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mb-8 bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100 shadow-inner">
                    <div className="flex-1">
                        <label className="block text-blue-800 font-black text-sm mb-2 uppercase tracking-wide px-2"><i className="fas fa-map text-blue-500 mr-2"></i>Map</label>
                        <select value={mapId} onChange={e => setMapId(parseInt(e.target.value))} className="w-full p-3 rounded-xl border-2 border-blue-200 text-lg font-bold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm cursor-pointer transition-all">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Map {n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-blue-800 font-black text-sm mb-2 uppercase tracking-wide px-2"><i className="fas fa-layer-group text-blue-500 mr-2"></i>Level</label>
                        <select value={levelId} onChange={e => setLevelId(parseInt(e.target.value))} className="w-full p-3 rounded-xl border-2 border-blue-200 text-lg font-bold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm cursor-pointer transition-all">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Level {n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-blue-800 font-black text-sm mb-2 uppercase tracking-wide px-2"><i className="fas fa-crosshairs text-blue-500 mr-2"></i>เป้าหมาย (ครั้ง)</label>
                        <input type="number" value={parMoves} onChange={e => setParMoves(e.target.value)} min="1" className="w-full p-3 rounded-xl border-2 border-blue-200 text-xl font-black bg-white text-center text-blue-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all" />
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-6 items-stretch w-full mb-10">
                    <div className="w-full xl:w-[45%] flex-1"><VisualEditor id="adminLhs" label="สมการฝั่งซ้าย (LHS)" value={lhsHtml} onChange={setLhsHtml} /></div>
                    <div className="flex items-center justify-center py-4 xl:py-0">
                        <div className="text-5xl font-black text-white bg-gradient-to-br from-red-400 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_4px_0_#be123c] border-4 border-white flex-shrink-0 z-10 transform hover:scale-110 transition-transform">=</div>
                    </div>
                    <div className="w-full xl:w-[45%] flex-1"><VisualEditor id="adminRhs" label="สมการฝั่งขวา (RHS)" value={rhsHtml} onChange={setRhsHtml} /></div>
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl mb-6 font-black text-center text-lg border-2 shadow-sm animate-bounce ${message.includes('เรียบร้อย') ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                        {message}
                    </div>
                )}

                <button onClick={handleSave} className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white font-black py-5 rounded-[1.5rem] text-2xl shadow-[0_8px_0_#166534] active:translate-y-[8px] active:shadow-none transition-all uppercase tracking-wider border-2 border-green-300 hover:brightness-110">
                    <i className="fas fa-save mr-3"></i> บันทึกข้อมูลด่าน
                </button>
            </div>
        </div>
    );
}

function Leaderboard({ setView, leaderboard }) {
    return (
        <div className="p-4 md:p-8 h-screen flex justify-center items-center relative">
            <button onClick={() => setView('menu')} className="absolute top-4 left-4 md:top-8 md:left-8 bg-white text-gray-700 px-4 py-2 md:px-6 md:py-3 rounded-full font-black shadow-[0_4px_0_#d1d5db] active:translate-y-[4px] active:shadow-none transition-all text-sm md:text-lg border-2 border-gray-200 z-10"><i className="fas fa-chevron-left mr-2"></i> กลับเมนู</button>
            
            <div className="bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-xl border-4 border-white max-w-2xl w-full h-[85vh] flex flex-col mt-10 md:mt-0">
                <div className="flex justify-center items-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-800 bg-yellow-300 px-8 py-3 rounded-full shadow-sm border-4 border-white transform rotate-1"><i className="fas fa-trophy text-yellow-600 mr-3"></i>ตารางอันดับผู้เล่น</h1>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {leaderboard.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10 text-base md:text-xl font-bold bg-gray-100 py-8 rounded-3xl border-2 border-dashed border-gray-300">ยังไม่มีข้อมูลผู้เล่นครับ</div>
                    ) : (
                        leaderboard.map((u, index) => (
                            <div key={u.id} className={`flex items-center justify-between p-4 rounded-2xl border-4 shadow-sm transform transition hover:scale-[1.02] ${index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-400' : index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300' : index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-300' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-lg md:text-xl border-2 border-white shadow-sm ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-500'}`}>{index + 1}</div>
                                    <div className="text-base md:text-xl font-bold text-gray-700">{u.displayName}</div>
                                </div>
                                <div className="text-xl md:text-2xl font-black text-gray-800 bg-white/50 px-4 py-1 rounded-full shadow-inner">{u.totalStars} <i className="fas fa-star text-yellow-500"></i></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// THE CORE GAME ENGINE WRAPPER (Perfected & Restored Division)
// ==========================================
function GameEngine({ view, setView, levelData, mapId, levelId, setSelectedLevel, setLevelData, allLevels, saveProgress }) {
    const gameContainerRef = useRef(null);
    const [moves, setMoves] = useState(0);
    const [gameState, setGameState] = useState('playing'); 
    const [starsEarned, setStarsEarned] = useState(0);
    const [showTutorial, setShowTutorial] = useState(false);
    
    // Popup & Final Answer State
    const [popupMessage, setPopupMessage] = useState(null);
    const [finalAnswer, setFinalAnswer] = useState("");
    
    const isSandbox = view === 'sandbox';
    const [sbLhsHtml, setSbLhsHtml] = useState('<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true">x</span><div class="frac-line"></div><span class="frac-den" contenteditable="true">2</span></span>');
    const [sbRhsHtml, setSbRhsHtml] = useState('10');

    const engineRef = useRef({
        localGameState: { lhs: [], rhs: [] },
        historyStack: [], historyIndex: -1, internalMoveCount: 0, dragSrc: null, audioCtx: null
    });

    const engineCSS = `
        .term-container { display: inline-flex; align-items: center; margin: 0 2px; transition: all 0.2s; }
        .term-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; color: #4a5568; font-family: 'Fredoka', sans-serif; font-weight: 600; border-radius: 12px; cursor: grab; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border: 2px solid #e2e8f0; position: relative; user-select: none; }
        .term-card.is-variable { background: #4FACFE; color: white; border-color: #00f2fe; }
        .term-card.is-number { background: linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%); color: white; border-color: #fff; }
        .term-card.is-operator { background: transparent; box-shadow: none; border: none; color: #718096; padding: 0 4px; min-width: auto; cursor: default; }
        .term-card.is-operator.interactive { cursor: pointer; }
        .term-card.is-operator.draggable-negative { cursor: grab; color: #e53e3e; font-weight: bold; }
        .term-card:active { transform: scale(0.95); }
        
        .fraction-group { display: inline-flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.7); border: 2px dashed #cbd5e0; cursor: grab; margin: 0 4px; }
        .fraction-line { width: 100%; background-color: #4a5568; margin: 4px 0; }
        .numerator-container, .denominator-container { display: flex; align-items: center; justify-content: center; padding: 2px; }
        
        .group-bracket { color: #94a3b8; font-weight: 300; line-height: 0.8; font-family: 'Kanit'; cursor: default; }
        .dragging-ghost { opacity: 0.9; position: fixed; z-index: 9999; pointer-events: none; transform: scale(1.05) rotate(2deg); box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.15); }

        @media (max-width: 768px) {
            .term-card { font-size: 1.2rem; padding: 6px 10px; min-width: 35px; border-radius: 10px; }
            .term-card.is-operator { font-size: 1.2rem; }
            .group-bracket { font-size: 2.2rem; transform: translateY(-2px); }
            .fraction-group { padding: 4px 6px; border-radius: 10px; }
            .fraction-line { height: 2px; }
            .numerator-container, .denominator-container { min-height: 25px; min-width: 30px; }
        }
        @media (min-width: 769px) {
            .term-card { font-size: 1.8rem; padding: 10px 16px; min-width: 60px; border-radius: 16px; }
            .term-card.is-operator { font-size: 1.5rem; }
            .group-bracket { font-size: 3.5rem; transform: translateY(-4px); }
            .fraction-group { padding: 8px 12px; border-radius: 16px; }
            .fraction-line { height: 3px; }
            .numerator-container, .denominator-container { min-height: 45px; min-width: 60px; }
        }
        
        @keyframes slideUpFade {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes zoomInCenter {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;

    const initEngine = (lhsHtmlSource, rhsHtmlSource) => {
        const eng = engineRef.current;
        eng.internalMoveCount = 0; setMoves(0); eng.historyStack = []; eng.historyIndex = -1;
        setGameState('playing');
        
        if(!eng.audioCtx) eng.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        eng.playTone = (type) => {
            if (!eng.audioCtx) return;
            if (eng.audioCtx.state === 'suspended') eng.audioCtx.resume();
            const oscillator = eng.audioCtx.createOscillator();
            const gainNode = eng.audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(eng.audioCtx.destination);
            if (type === 'success') {
                oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(500, eng.audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(1000, eng.audioCtx.currentTime + 0.1); gainNode.gain.setValueAtTime(0.3, eng.audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, eng.audioCtx.currentTime + 0.3); oscillator.start(); oscillator.stop(eng.audioCtx.currentTime + 0.3);
            } else if (type === 'error') {
                oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(150, eng.audioCtx.currentTime); oscillator.frequency.linearRampToValueAtTime(100, eng.audioCtx.currentTime + 0.2); gainNode.gain.setValueAtTime(0.2, eng.audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.01, eng.audioCtx.currentTime + 0.2); oscillator.start(); oscillator.stop(eng.audioCtx.currentTime + 0.2);
            } else if (type === 'pop') {
                oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(400, eng.audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(600, eng.audioCtx.currentTime + 0.05); gainNode.gain.setValueAtTime(0.2, eng.audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, eng.audioCtx.currentTime + 0.1); oscillator.start(); oscillator.stop(eng.audioCtx.currentTime + 0.1);
            } else if (type === 'win') {
                const now = eng.audioCtx.currentTime;
                const notes = [261.63, 329.63, 392.00, 523.25];
                notes.forEach((freq, i) => {
                    const osc = eng.audioCtx.createOscillator();
                    const gn = eng.audioCtx.createGain();
                    osc.type = 'square'; osc.frequency.value = freq; osc.connect(gn); gn.connect(eng.audioCtx.destination);
                    osc.start(now + i * 0.15); gn.gain.setValueAtTime(0.2, now + i * 0.15); gn.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4); osc.stop(now + i * 0.15 + 0.4);
                });
            }
        };

        eng.showPopup = (msg) => {
            eng.playTone('error');
            setPopupMessage(msg);
        };

        const parseHTMLtoMath = (htmlString) => {
            if (!htmlString) return { terms: [], TermObj: null };
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = htmlString;
            let eq = '';
            function traverse(node) {
                if (node.nodeType === Node.TEXT_NODE) eq += node.textContent;
                else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.classList.contains('editor-fraction')) {
                        let num = node.querySelector('.frac-num')?.innerText.trim() || '1';
                        let den = node.querySelector('.frac-den')?.innerText.trim() || '1';
                        eq += `(${num})/(${den})`;
                    } else node.childNodes.forEach(child => traverse(child));
                }
            }
            traverse(tempDiv);
            let str = eq.replace(/\s+/g, '').replace(/x/g, 'x');
            let oldStr; do { oldStr = str; str = str.replace(/\(\(([^()]+)\)\)/g, '($1)'); } while (oldStr !== str);
            class Term { constructor(type, value, children = null, denominator = null) { this.id = Math.random().toString(36).substr(2, 9); this.type = type; this.value = value; this.children = children; this.denominator = denominator; } }
            function parseExpression(s) {
                let terms = [], buffer = '', depth = 0; s = s.replace(/\*/g, '•');
                for (let i = 0; i < s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && (char === '+' || char === '-')) { if (buffer === '') buffer += char; else { terms.push(...parseTermGroup(buffer)); terms.push(new Term('op', char)); buffer = ''; } } else buffer += char;
                }
                if (buffer) terms.push(...parseTermGroup(buffer)); return terms;
            }
            function parseTermGroup(s) {
                let parts = [], buffer = '', depth = 0;
                for(let i=0; i<s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && char === '•') { if(buffer) parts.push(parseSingleTerm(buffer)); parts.push(new Term('op', '•')); buffer = ''; } else buffer += char;
                }
                if(buffer) parts.push(parseSingleTerm(buffer)); return parts;
            }
            function parseSingleTerm(s) {
                if (s.startsWith('(') && s.endsWith(')')) {
                    let d = 0, match = true; for(let i=0; i<s.length-1; i++) { if(s[i] === '(') d++; if(s[i] === ')') d--; if(d === 0) { match = false; break; } }
                    if(match) { let inner = s.slice(1, -1), innerTerms = parseExpression(inner); if (innerTerms.length > 1) return new Term('group', null, innerTerms); else if (innerTerms.length === 1) return innerTerms[0]; }
                }
                let depth = 0, slashIdx = -1; for(let i=0; i<s.length; i++) { if(s[i] === '(') depth++; if(s[i] === ')') depth--; if(depth === 0 && s[i] === '/') { slashIdx = i; break; } }
                if (slashIdx !== -1) { return new Term('fraction', null, parseExpression(s.substring(0, slashIdx)), (parseExpression(s.substring(slashIdx + 1)).length===1 ? parseExpression(s.substring(slashIdx + 1))[0] : new Term('group',null,parseExpression(s.substring(slashIdx + 1))))); }
                return new Term('term', s);
            }
            return { terms: parseExpression(str), TermObj: Term };
        };

        const { terms: parsedLhs, TermObj } = parseHTMLtoMath(lhsHtmlSource);
        const { terms: parsedRhs } = parseHTMLtoMath(rhsHtmlSource);
        eng.localGameState.lhs = parsedLhs; eng.localGameState.rhs = parsedRhs; eng.TermClass = TermObj;

        eng.gcd = (a, b) => b === 0 ? a : eng.gcd(b, a % b);
        eng.lcm = (a, b) => { if (a === 0 || b === 0) return 0; return Math.abs((a * b) / eng.gcd(a, b)); }
        eng.shakeElement = (el) => { el.style.transform = 'translateX(5px)'; setTimeout(()=>el.style.transform='none', 200); }

        eng.commitState = () => {
            for(let k=0; k<2; k++) { eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs); eng.unwrapGroups(eng.localGameState.lhs); eng.unwrapGroups(eng.localGameState.rhs); }
            eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs);
            eng.historyStack.push(JSON.parse(JSON.stringify(eng.localGameState))); eng.historyIndex++; eng.render(); eng.checkWinCondition();
        };
        eng.undo = () => { if (eng.historyIndex > 0) { eng.historyIndex--; eng.localGameState = JSON.parse(JSON.stringify(eng.historyStack[eng.historyIndex])); eng.render(); eng.playTone('pop'); } };
        
        eng.unwrapGroups = (list) => {
            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') {
                    let isMultiplying = (i > 0 && list[i-1].value === '•') || (i < list.length - 1 && list[i+1].value === '•');
                    eng.unwrapGroups(term.children);
                    if (term.children.length === 1 && term.children[0].type === 'group') { term.children = term.children[0].children; i--; continue; }
                    if (term.children.length === 1 && term.children[0].type === 'term') { list.splice(i, 1, term.children[0]); i--; continue; }
                    else if (term.children.length === 2 && term.children[0].type === 'op' && term.children[1].type === 'term') {
                        let op = term.children[0], val = term.children[1];
                        if (op.value === '+') list.splice(i, 1, val); else if (op.value === '-') { list.splice(i, 1, op, val); i++; }
                    }
                    if (!isMultiplying || (!isMultiplying && term.children.length === 1)) { list.splice(i, 1, ...term.children); i--; }
                } else if (term.type === 'fraction') {
                    if (term.children) eng.unwrapGroups(term.children);
                    if (term.denominator && term.denominator.type === 'group') { eng.unwrapGroups(term.denominator.children); if (term.denominator.children.length === 1 && term.denominator.children[0].type === 'term') term.denominator = term.denominator.children[0]; }
                }
            }
        };

eng.simplifyList = (list) => {
            while (list.length > 0 && list[0].type === 'op' && list[0].value === '+') list.shift();

            // ดักจับกรณีเครื่องหมายลบโดดๆ อยู่หน้าสุด (แก้ปัญหา 14 = -x)
            if (list.length >= 2 && list[0].type === 'op' && list[0].value === '-' && list[1].type === 'term') {
                if (!list[1].value.startsWith('-')) {
                    list[1].value = '-' + list[1].value;
                } else {
                    list[1].value = list[1].value.substring(1);
                }
                list.shift(); // ลบเครื่องหมายลบที่อยู่แยกออกไป
            }

            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') eng.simplifyList(term.children);
                if (term.type === 'fraction') { if (term.children) eng.simplifyList(term.children); if (term.denominator && term.denominator.type === 'group') eng.simplifyList(term.denominator.children); }
                if (i === 0 && term.type === 'op' && term.value === '+') { list.splice(i, 1); i--; continue; }
                if (term.type === 'op' && term.value === '-' && i < list.length - 1 && list[i+1].type === 'term' && list[i+1].value.startsWith('-')) { term.value = '+'; list[i+1].value = list[i+1].value.substring(1); }
                if (term.type === 'op' && i < list.length - 1 && list[i+1].type === 'op') { let n = list[i+1]; if (term.value === '-' && n.value === '-') { term.value = '+'; list.splice(i+1, 1); i--; } else if (term.value === '+' && n.value === '-') { term.value = '-'; list.splice(i+1, 1); i--; } else if (term.value === '-' && n.value === '+') { term.value = '-'; list.splice(i+1, 1); i--; } else if (term.value === '+' && n.value === '+') { term.value = '+'; list.splice(i+1, 1); i--; } }
                if (term.type === 'term') {
                    if (term.value && term.value.startsWith('+') && term.value.length > 1) term.value = term.value.substring(1);
                    if (term.value && term.value.startsWith('-') && term.value.length > 1) { if (i > 0 && list[i-1].type === 'op') { let op = list[i-1]; if (op.value === '+') { op.value = '-'; term.value = term.value.substring(1); } else if (op.value === '-') { op.value = '+'; term.value = term.value.substring(1); } } else if (i === 1 && list[0].type === 'op' && list[0].value === '-') { list.shift(); term.value = term.value.substring(1); i--; } }
                    if (term.value) { let m = term.value.match(/^(-?)1([a-zA-Z]+)$/); if (m) term.value = m[1] + m[2]; }
                }
                if (term.type === 'term' && term.value === '1') { if (i+1 < list.length && list[i+1].value === '•') { list.splice(i, 2); i--; continue; } if (i > 0 && list[i-1].value === '•') { list.splice(i-1, 2); i-=2; continue; } }
                if (term.type === 'fraction') { let denVal = term.denominator.type === 'term' ? term.denominator.value : (term.denominator.type === 'group' && term.denominator.children.length === 1 && term.denominator.children[0].type === 'term' ? term.denominator.children[0].value : null); if (denVal === '1') { let content = term.children; let newTerm = (content.length === 1 && content[0].type !== 'op') ? content[0] : new eng.TermClass('group', null, content); list.splice(i, 1, newTerm); i--; continue; } }
            }
        };

        eng.render = () => {
            const lhsZone = document.getElementById('engine-lhs'), rhsZone = document.getElementById('engine-rhs');
            if(lhsZone) { lhsZone.innerHTML = ''; eng.localGameState.lhs.forEach((t, i) => lhsZone.appendChild(eng.createTermElement(t, 'lhs', eng.localGameState.lhs, i, 0))); }
            if(rhsZone) { rhsZone.innerHTML = ''; eng.localGameState.rhs.forEach((t, i) => rhsZone.appendChild(eng.createTermElement(t, 'rhs', eng.localGameState.rhs, i, 0))); }
        };

        const makeDoubleTap = (el, action) => {
            let tapCount = 0; let tapTimer = null;
            el.ondblclick = (e) => { 
                e.stopPropagation(); 
                eng.internalMoveCount -= 1; setMoves(eng.internalMoveCount); // หักลบสเตปส่วนเกิน
                action(); 
            };
            el.ontouchend = (e) => {
                if (eng.dragSrc && eng.dragSrc.hasMoved) { tapCount = 0; return; }
                tapCount++;
                if (tapCount === 1) { tapTimer = setTimeout(() => { tapCount = 0; }, 300); } 
                else if (tapCount === 2) { 
                    clearTimeout(tapTimer); tapCount = 0; 
                    if(e.cancelable) e.preventDefault(); 
                    eng.internalMoveCount -= 1; setMoves(eng.internalMoveCount); // หักลบสเตปส่วนเกิน
                    action(); 
                }
            };
        };

        eng.createTermElement = (term, side, list, idx, depth) => {
            let wrapper = document.createElement('div'); wrapper.className = 'term-container'; wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            if (term.type === 'op') {
                let card = document.createElement('div'); card.className = 'term-card is-operator'; card.innerText = term.value;
                if (term.value === '•') { makeDoubleTap(card, () => { eng.combineSplitTerm(term, list, idx); eng.commitState(); }); } 
                else if (term.value === '-' && idx < list.length - 1 && (list[idx+1].type === 'group' || list[idx+1].type === 'fraction')) { card.classList.add('draggable-negative'); eng.setupDrag(card, term, side, list, idx, 'distribute-negative'); }
                wrapper.appendChild(card);
            } else if (term.type === 'group') {
                let br = (depth % 3 === 0) ? ['(', ')'] : (depth % 3 === 1) ? ['[', ']'] : ['{', '}'];
                let lB = document.createElement('div'); lB.innerText = br[0]; lB.className = 'group-bracket'; let rB = document.createElement('div'); rB.innerText = br[1]; rB.className = 'group-bracket';
                wrapper.appendChild(lB); term.children.forEach((c, i) => wrapper.appendChild(eng.createTermElement(c, side, list, i, depth + 1))); wrapper.appendChild(rB);
                eng.setupDrag(wrapper, term, side, list, idx, 'group'); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else if (term.type === 'fraction') {
                let fracGroup = document.createElement('div'); fracGroup.className = 'fraction-group';
                let numCont = document.createElement('div'); numCont.className = 'numerator-container'; numCont.dataset.parentFracId = term.id;
                term.children.forEach((c, i) => numCont.appendChild(eng.createChildTermElement(c, term.children, i, term.id, 'numerator', side, null, null, null, depth)));
                let line = document.createElement('div'); line.className = 'fraction-line';
                let denCont = document.createElement('div'); denCont.className = 'denominator-container'; denCont.dataset.parentFracId = term.id;
                if (term.denominator.type === 'group') term.denominator.children.forEach((c, i) => denCont.appendChild(eng.createChildTermElement(c, term.denominator.children, i, term.id, 'denominator', side, term, list, idx, depth)));
                else denCont.appendChild(eng.createChildTermElement(term.denominator, null, -1, term.id, 'denominator', side, term, list, idx, depth));
                fracGroup.append(numCont, line, denCont); 
                makeDoubleTap(fracGroup, () => { eng.splitFraction(term, list, idx); });
                eng.setupDrag(fracGroup, term, side, list, idx, 'whole-fraction'); wrapper.appendChild(fracGroup); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else {
                let card = document.createElement('div'); card.className = term.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number'; card.innerText = term.value;
                makeDoubleTap(card, () => { eng.splitTerm(term, list, idx); });
                eng.setupDrag(card, term, side, list, idx, 'term'); wrapper.appendChild(card); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            }
            return wrapper;
        };

        eng.createChildTermElement = (child, list, childIdx, parentId, context, side, parentFracTerm, mainList, mainIdx, depth) => {
            let el;
            if (child.type === 'group') {
                el = document.createElement('div'); el.className = 'term-container inline-flex items-center mx-1'; 
                let br = (depth % 3 === 0) ? ['(', ')'] : (depth % 3 === 1) ? ['[', ']'] : ['{', '}']; let lB = document.createElement('div'); lB.innerText = br[0]; lB.className = 'group-bracket'; let rB = document.createElement('div'); rB.innerText = br[1]; rB.className = 'group-bracket';
                el.appendChild(lB); child.children.forEach((gc, i) => el.appendChild(eng.createChildTermElement(gc, child.children, i, parentId, context, side, parentFracTerm, mainList, mainIdx, depth + 1))); el.appendChild(rB);
                if(list) eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context);
            } else {
                el = child.type === 'op' ? document.createElement('span') : document.createElement('div');
                if (parentId) el.dataset.parentFracId = parentId; 
                if(child.type === 'op') { 
                    el.className = 'term-card is-operator mx-1'; el.innerText = child.value;
                    if(child.value === '•' && list) { makeDoubleTap(el, () => { eng.combineSplitTerm(child, list, childIdx); eng.commitState(); }); }
                    else if (child.value === '-' && list && childIdx < list.length - 1 && list[childIdx+1].type === 'group') { el.classList.add('draggable-negative'); eng.setupDrag(el, child, side, list, childIdx, 'distribute-negative', parentFracTerm, mainList, mainIdx, context); }
                } else {
                    el.className = (child.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number') + ' px-1 py-1 min-w-[20px] ' + context + '-term'; el.innerText = child.value; el.dataset.parentFracId = parentId; 
                    if(list) el.dataset.childIdx = childIdx;
                    if (context === 'denominator' && !list) { el.dataset.childIdx = 0; eng.setupDrag(el, parentFracTerm, null, mainList, mainIdx, 'denominator', null, null, null, context); } 
                    else if(list) { makeDoubleTap(el, () => { eng.splitTerm(child, list, childIdx); }); eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context); }
                }
            }
            if (el && list) el.dataset.side = side;
            return el;
        };

        const findFractionTerm = (list, id) => {
            for (let t of list) {
                if (t.id === id && t.type === 'fraction') return t;
                if (t.children) { let found = findFractionTerm(t.children, id); if (found) return found; }
                if (t.denominator && t.denominator.type === 'group') { let found = findFractionTerm(t.denominator.children, id); if (found) return found; }
            }
            return null;
        };

        eng.handleFractionDivision = (targetElement) => {
            let targetCard = targetElement.closest('.term-card'); if (!targetCard) return;
            let parentFracId = targetCard.dataset.parentFracId;
            let srcTerm = eng.dragSrc.term;

            let numValStr = targetCard.innerText;
            let denValStr;
            if (eng.dragSrc.role === 'denominator') {
                if (srcTerm.denominator.type === 'term') {
                    denValStr = srcTerm.denominator.value;
                } else if (srcTerm.denominator.type === 'group') {
                    let gc = srcTerm.denominator.children;
                    if (gc.length === 1 && gc[0].type === 'term') denValStr = gc[0].value;
                    else if (gc.length === 2 && gc[0].value === '-' && gc[1].type === 'term') denValStr = "-" + gc[1].value;
                    else return;
                } else return;
            } else { denValStr = srcTerm.value; }

            let nVal = parseInt(numValStr), dVal = parseInt(denValStr);
            if (isNaN(nVal) || isNaN(dVal)) return; if (dVal === 0) return;
            let common = eng.gcd(Math.abs(nVal), Math.abs(dVal));

            let mainList = (targetCard.dataset.side === 'lhs') ? eng.localGameState.lhs : eng.localGameState.rhs;
            let fractionTerm = findFractionTerm(mainList, parentFracId);
            if (!fractionTerm) return;
            let numeratorList = fractionTerm.children;
            let isTargetDenominator = targetCard.closest('.denominator-container') !== null;
            let isTargetNumerator = targetCard.closest('.numerator-container') !== null;
            
            if (isTargetDenominator) {
                if (common === 1 && Math.abs(dVal) !== 1) { eng.showPopup("ตัดทอนไม่ได้ (ไม่มีตัวหารร่วมกันครับ)"); eng.shakeElement(targetElement); return; }
                let newDenomVal = Math.abs(nVal) / common;
                if (fractionTerm.denominator.type === 'term') fractionTerm.denominator.value = newDenomVal.toString();
                else if (fractionTerm.denominator.children) fractionTerm.denominator.children[0].value = newDenomVal.toString();
                
                let newSourceVal = Math.abs(dVal) / common;
                if (dVal < 0) newSourceVal = -newSourceVal;
                if (eng.dragSrc.role === 'inner-term' || eng.dragSrc.role === 'term') eng.dragSrc.term.value = newSourceVal.toString();
            }
            else if (isTargetNumerator) {
                let isPolynomial = numeratorList.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'));
                if (isPolynomial) {
                    let termsToDivide = [];
                    for(let t of numeratorList) {
                        if (t.type === 'term') {
                            let val = parseInt(t.value);
                            if (t.value.match(/[a-zA-Z]/)) {
                                let m = t.value.match(/^(-?\d*)([a-zA-Z]+)$/);
                                val = m[1] === '' ? 1 : (m[1] === '-' ? -1 : parseInt(m[1]));
                            }
                            termsToDivide.push(val);
                        }
                    }
                    let allDivisible = termsToDivide.every(coef => coef % dVal === 0);
                    if (!allDivisible) { eng.showPopup("ต้องหารลงตัวทุกพจน์พร้อมกันครับ"); eng.shakeElement(targetElement); return; }

                    for(let t of numeratorList) {
                        if (t.type === 'term') {
                            let m = t.value.match(/^(-?\d*)([a-zA-Z]*)$/);
                            if (m) {
                                let coef = m[1] === '' ? 1 : (m[1] === '-' ? -1 : parseInt(m[1]));
                                let variable = m[2];
                                let newCoef = coef / dVal;
                                t.value = newCoef + variable;
                            }
                        }
                    }
                    if (eng.dragSrc.role === 'inner-term' || eng.dragSrc.role === 'term') eng.dragSrc.term.value = "1";
                } else {
                    if (common === 1 && Math.abs(dVal) !== 1) { eng.showPopup("ตัดทอนไม่ได้ (ไม่มีตัวหารร่วมกันครับ)"); eng.shakeElement(targetElement); return; }
                    let resultSign = (nVal * dVal >= 0) ? 1 : -1;
                    let newNumValCalc = (Math.abs(nVal) / common) * resultSign;
                    let newSourceVal = Math.abs(dVal) / common;
                    
                    let targetNumTerm = numeratorList[parseInt(targetCard.dataset.childIdx)];
                    let numVarMatch = targetNumTerm.value.match(/[a-zA-Z]+/);
                    let numVar = numVarMatch ? numVarMatch[0] : "";
                    targetNumTerm.value = newNumValCalc + numVar;
                    
                    if (eng.dragSrc.role === 'inner-term' || eng.dragSrc.role === 'term') eng.dragSrc.term.value = newSourceVal.toString();
                }
            }
            
            if (eng.dragSrc.role === 'denominator') {
                if (isTargetNumerator) {
                    let newSrcDenomVal = Math.abs(dVal) / common;
                    eng.dragSrc.term.denominator = new eng.TermClass('term', newSrcDenomVal.toString());
                }
            }
            eng.commitState();
            eng.playTone('success');
        };

        eng.setupDrag = (el, term, side, list, idx, role, parentFracTerm = null, mainList = null, mainIdx = null, sourceContext = null) => {
            const handleStart = (clientX, clientY, eOriginal) => {
                eOriginal.stopPropagation(); 
                if (eOriginal.type !== 'touchstart' && eOriginal.cancelable) eOriginal.preventDefault();

                eng.internalMoveCount++; setMoves(eng.internalMoveCount);
                if (eng.dragSrc && eng.dragSrc.ghost) eng.dragSrc.ghost.remove();

                eng.dragSrc = { el, term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext, hasMoved: false };
                let ghost = el.cloneNode(true); ghost.classList.add('dragging-ghost'); ghost.style.width = el.offsetWidth + 'px'; 
                document.body.appendChild(ghost); eng.dragSrc.ghost = ghost;
                
                const moveGhost = (x, y) => { 
                    if(eng.dragSrc && eng.dragSrc.ghost) {
                        eng.dragSrc.ghost.style.left = (x - eng.dragSrc.ghost.offsetWidth/2) + 'px'; 
                        eng.dragSrc.ghost.style.top = (y - eng.dragSrc.ghost.offsetHeight/2) + 'px'; 
                    }
                };
                moveGhost(clientX, clientY);
                
                const onMove = (ev) => { 
                    let cx = ev.clientX ?? ev.touches?.[0]?.clientX; let cy = ev.clientY ?? ev.touches?.[0]?.clientY; 
                    if(cx && cy) { if (eng.dragSrc) eng.dragSrc.hasMoved = true; moveGhost(cx, cy); if (ev.cancelable) ev.preventDefault(); }
                };
                
                const onEnd = (ev) => {
                    document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                    document.removeEventListener('touchcancel', onEnd);

                    if (!eng.dragSrc) return;
                    let endX = ev.clientX ?? ev.changedTouches?.[0]?.clientX; let endY = ev.clientY ?? ev.changedTouches?.[0]?.clientY;
                    if (eng.dragSrc.ghost) eng.dragSrc.ghost.remove();

                    let pg = document.getElementById('engine-playground');
                    if(pg && endX && endY && eng.dragSrc.hasMoved) {
                        let rect = pg.getBoundingClientRect(), midX = rect.left + rect.width/2;
                        let isGlobalMove = (role === 'term' || role === 'denominator' || role === 'whole-fraction');
                        let currentSide = eng.dragSrc.side || (eng.dragSrc.list === eng.localGameState.lhs ? 'lhs' : (eng.dragSrc.list === eng.localGameState.rhs ? 'rhs' : null));
                        let crossRight = currentSide === 'lhs' && endX > midX + 30, crossLeft = currentSide === 'rhs' && endX < midX - 30;
                        
                        if (isGlobalMove && (crossRight || crossLeft)) {
                            eng.dragSrc.side = currentSide; eng.executeMoveSide();
                        } else {
                            let elemBelow = document.elementFromPoint(endX, endY); 
                            
                            let numTarget = elemBelow ? elemBelow.closest('.numerator-container, .numerator-term') : null;
                            if (numTarget && (role === 'denominator' || (role === 'inner-term' && sourceContext === 'numerator'))) {
                                if (role === 'inner-term') { 
                                    let targetEl = elemBelow.closest('.term-container'); 
                                    if(targetEl && targetEl !== eng.dragSrc.el.closest('.term-container')) eng.tryCombine(targetEl);
                                } else eng.handleFractionDivision(elemBelow);
                            } else {
                                let denTarget = elemBelow ? elemBelow.closest('.denominator-container, .denominator-term') : null;
                                if (denTarget) {
                                    if (role === 'term' || role === 'inner-term') eng.handleFractionDivision(elemBelow);
                                } else {
                                    if (role === 'distribute-negative') {
                                        let cItem = eng.dragSrc.el.closest('.term-container'); let nItem = cItem ? cItem.nextElementSibling : null;
                                        if (nItem && (nItem === elemBelow || nItem.contains(elemBelow))) { eng.distributeNegative(eng.dragSrc.term, eng.dragSrc.list, eng.dragSrc.idx); }
                                    } else {
                                        let targetEl = elemBelow ? elemBelow.closest('.term-container') : null;
                                        if(targetEl && targetEl !== eng.dragSrc.el.closest('.term-container')) {
                                            eng.tryCombine(targetEl); 
                                        }
                                    }
                                }
                            }
                        }
                    }
                    setTimeout(() => { if (eng.dragSrc && eng.dragSrc.ghost) eng.dragSrc.ghost.remove(); eng.dragSrc = null; }, 0);
                };

                document.addEventListener('mousemove', onMove, {passive: false}); document.addEventListener('touchmove', onMove, {passive: false});
                document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
                document.addEventListener('touchcancel', onEnd);
            };
            el.onmousedown = (e) => { if(e.button === 0) handleStart(e.clientX, e.clientY, e); };
            el.ontouchstart = (e) => { if(e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY, e); };
        };

        eng.executeMoveSide = () => {
            let { term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext } = eng.dragSrc;
            if (role === 'inner-term' && parentFracTerm && list.length === 1) { term = parentFracTerm; list = mainList; idx = mainIdx; role = 'denominator'; }
            if (!list) return; let targetList = side === 'lhs' ? eng.localGameState.rhs : eng.localGameState.lhs;
            
            if (role === 'denominator') {
                if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) return eng.showPopup("ต้องรวมเศษส่วนฝั่งนี้ให้เป็นก้อนเดียวกันก่อน จึงจะย้ายตัวหารได้ครับ");
                list.splice(idx, 1, new eng.TermClass('group', null, JSON.parse(JSON.stringify(term.children))));
                if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                
                let val = "1";
                if (term.denominator.type === 'term') val = term.denominator.value;
                else if (term.denominator.type === 'group') {
                    let gc = term.denominator.children;
                    if (gc.length === 1 && gc[0].type === 'term') val = gc[0].value;
                    else if (gc.length === 2 && gc[0].value === '-' && gc[1].type === 'term') val = "-" + gc[1].value;
                }
                
                // ล้าง 0 ออกหากมีการย้ายตัวอื่นเข้ามา
                if (targetList.length === 1 && targetList[0].type === 'term' && targetList[0].value === '0') {
                    targetList.length = 0;
                }

                if(term.denominator.type === 'group' && term.denominator.children.length === 1) targetList.push(new eng.TermClass('op', '•'), term.denominator.children[0]);
                else if (term.denominator.type === 'group') targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('group', null, term.denominator.children));
                else targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', val));
                eng.playTone('success');
            } else {
                let isFactor = false, removeIdx = idx, removeCount = 1, nextTerm = (idx < list.length - 1) ? list[idx+1] : null, prevTerm = (idx > 0) ? list[idx-1] : null;
                if (nextTerm && nextTerm.value === '•') { isFactor = true; removeCount = 2; } else if (prevTerm && prevTerm.value === '•') { isFactor = true; removeIdx = idx - 1; removeCount = 2; }
                if (isFactor || sourceContext === 'denominator') {
                    if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) return eng.showPopup("ต้องกำจัดบวกลบก่อนย้ายตัวคูณครับ");
                    let moveValue = term.value;
                    if(idx === 1 && list[0].type === 'op' && (list[0].value === '-' || list[0].value === '+')) { if(list[0].value === '-') moveValue = '-' + moveValue; removeIdx = 0; removeCount += 1; }
                    list.splice(removeIdx, removeCount);
                    if (list.length === 0) list.push(new eng.TermClass('term', '1'));
                    
                    // ล้าง 0 ออกหากมีการย้ายตัวอื่นเข้ามา
                    if (targetList.length === 1 && targetList[0].type === 'term' && targetList[0].value === '0') {
                        targetList.length = 0;
                    }

                    if (sourceContext === 'denominator') {
                        if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                        targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', moveValue));
                    } else {
                        let num = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('fraction', null, num, new eng.TermClass('term', moveValue)));
                    }
                    eng.playTone('success');
                } else {
                    let movingSign = '+'; if (idx > 0 && list[idx-1].type === 'op') { movingSign = list[idx-1].value; removeIdx = idx - 1; removeCount = 2; }
                    list.splice(removeIdx, removeCount); if(list.length > 0 && list[0].type === 'op' && (list[0].value === '+' || list[0].value === '•')) list.shift();
                    
                    // ใส่ 0 เข้าไปแทนที่หากฝั่งเดิมว่างเปล่า (ตอบโจทย์ที่ขอมา)
                    if (list.length === 0) list.push(new eng.TermClass('term', '0'));
                    
                    let newSign = movingSign === '+' ? '-' : '+';
                    
                    // ล้าง 0 ฝั่งปลายทางก่อนที่จะใส่ตัวใหม่เข้าไปรวม
                    if (targetList.length === 1 && targetList[0].type === 'term' && targetList[0].value === '0') {
                        targetList.length = 0;
                    }

                    if (targetList.length > 0) targetList.push(new eng.TermClass('op', newSign)); else if (newSign === '-') targetList.push(new eng.TermClass('op', '-'));
                    targetList.push(term);
                    eng.playTone('success');
                }
            }
            eng.commitState();
        };

        eng.tryCombine = (targetWrapper) => {
            let list = eng.dragSrc.list, targetIdx = parseInt(targetWrapper.dataset.idx);
            if (isNaN(targetIdx) || targetIdx === eng.dragSrc.idx) return;
            let min = Math.min(eng.dragSrc.idx, targetIdx), max = Math.max(eng.dragSrc.idx, targetIdx);
            
            if (max - min === 2) {
                let op = list[min+1];
                if (op && (op.value === '+' || op.value === '-')) {
                    if ((min > 0 && list[min-1].value === '•') || (max < list.length-1 && list[max+1].value === '•')) return eng.showPopup("ติดตัวคูณอยู่ครับ ต้องคูณเข้าวงเล็บก่อน");
                    let parseVar = (v) => { if(typeof v!=='string') return null; let m=v.match(/^(-?\d*)([a-zA-Z]+)$/); if(m) return {c: m[1]===''?1:(m[1]==='-'?-1:parseInt(m[1])), v: m[2]}; if(!isNaN(v)) return {c: parseInt(v), v: null}; return null; };
                    let p1 = parseVar(list[min].value), p2 = parseVar(list[max].value);
                    if (p1 && p2 && p1.v === p2.v) {
                        let s1 = (min > 0 && list[min-1].value === '-') ? -1 : 1, s2 = op.value === '-' ? -1 : 1;
                        let res = (p1.c * s1) + (p2.c * s2);
                        list.splice(min, 3, new eng.TermClass('term', res + (p1.v || '')));
                        eng.commitState(); eng.playTone('success'); return;
                    }
                } else if (op && op.value === '•') {
                     let p1 = parseInt(list[min].value), p2 = parseInt(list[max].value);
                     if(!isNaN(p1) && !isNaN(p2)) { list.splice(min, 3, new eng.TermClass('term', (p1*p2).toString())); eng.commitState(); eng.playTone('success'); return; }
                }
            }
        };

        eng.splitFraction = (term, list, idx) => { let nt = []; term.children.forEach(t => nt.push(t)); list.splice(idx, 1, ...nt); eng.commitState(); eng.playTone('pop'); };
        
        // แยกตัวแปรติดลบ (-x จะแตกออกเป็น -1 • x ได้อย่างถูกต้อง)
        eng.splitTerm = (term, list, idx) => { 
            let m = term.value.match(/^(-?\d*)([a-zA-Z]+)$/); 
            if(m) { 
                let coef = m[1];
                if (coef === '-') coef = '-1';
                else if (coef === '' || coef === '+') coef = '1';
                list.splice(idx, 1, new eng.TermClass('term', coef), new eng.TermClass('op', '•'), new eng.TermClass('term', m[2])); 
                eng.commitState(); eng.playTone('pop'); 
            }
        };
        
        eng.combineSplitTerm = (term, list, idx) => { if(idx>0 && idx<list.length-1) { list.splice(idx-1, 3, new eng.TermClass('term', list[idx-1].value + list[idx+1].value)); eng.commitState(); eng.playTone('success'); } };
        eng.distributeNegative = (term, list, idx) => { if(idx >= list.length-1) return; let t = list[idx+1]; if(t.type==='group') { list[idx].value='+'; list.splice(idx+1, 1, ...t.children); eng.commitState(); eng.playTone('pop'); } };

        eng.checkWinCondition = () => {
            const isSolved = (list) => list.length === 1 && list[0].type === 'term' && (list[0].value === 'x' || list[0].value === '1x');
            
            const extractNum = (node) => {
                if (node.type === 'term' && !isNaN(parseFloat(node.value))) return parseInt(node.value);
                if (node.type === 'group') {
                    if (node.children.length === 1 && node.children[0].type === 'term') return parseInt(node.children[0].value);
                    if (node.children.length === 2 && node.children[0].value === '-' && node.children[1].type === 'term') return -parseInt(node.children[1].value);
                }
                return null;
            };

            const isNumericValue = (list) => {
                if (list.length !== 1) return false;
                let t = list[0];
                if (t.type === 'term') return !isNaN(parseFloat(t.value)) && !t.value.match(/[a-zA-Z]/);
                
                if (t.type === 'fraction') {
                    if (!t.denominator) return false;
                    let denVal = extractNum(t.denominator);
                    if (denVal === null || denVal === 0) return false;

                    let numVal = null;
                    if (t.children.length === 1) numVal = extractNum(t.children[0]);
                    if (numVal === null) return false;

                    // ตรวจสอบว่าหารลงตัวไหม (ถ้าหารลงตัว ต้องให้เด็กหารให้เสร็จก่อน!)
                    if (numVal % denVal === 0) return false;
                    
                    let common = eng.gcd(Math.abs(numVal), Math.abs(denVal));
                    if (common > 1) return false;
                    return true;
                }
                return false;
            };

            if ((isSolved(eng.localGameState.lhs) && isNumericValue(eng.localGameState.rhs)) || 
                (isSolved(eng.localGameState.rhs) && isNumericValue(eng.localGameState.lhs))) {
                
                // เก็บคำตอบสุดท้ายไว้โชว์
                let lStr = document.getElementById('engine-lhs').innerText.replace(/\s+/g, '');
                let rStr = document.getElementById('engine-rhs').innerText.replace(/\s+/g, '');
                setFinalAnswer(`${lStr} = ${rStr}`);
                
                eng.playTone('win');
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#4ade80', '#3b82f6', '#fbbf24', '#f87171'] });
                setGameState('won');
                
                if (!isSandbox) {
                    let calcStars = (eng.internalMoveCount <= levelData?.parMoves) ? 5 : (eng.internalMoveCount === levelData?.parMoves+1 ? 4 : (eng.internalMoveCount === levelData?.parMoves+2 ? 3 : (eng.internalMoveCount === levelData?.parMoves+3 ? 2 : 1)));
                    if (calcStars < 1) calcStars = 1;
                    setStarsEarned(calcStars); saveProgress(mapId, levelId, calcStars);
                }
            }
        };

        eng.commitState();
    };

    useEffect(() => {
        if (!isSandbox) {
            if (levelData) {
                initEngine(levelData.lhsHtml || levelData.lhs || '', levelData.rhsHtml || levelData.rhs || '');
            }
        } else {
            initEngine(sbLhsHtml, sbRhsHtml);
        }
        return () => { if(engineRef.current.audioCtx) engineRef.current.audioCtx.suspend(); };
    }, [levelData, isSandbox]);

    const handleRestart = () => {
        if (isSandbox) {
            initEngine(sbLhsHtml, sbRhsHtml);
        } else {
            if(levelData) initEngine(levelData.lhsHtml || levelData.lhs || '', levelData.rhsHtml || levelData.rhs || '');
        }
    };

    const handleNextLevel = () => {
        const nextLvl = levelId + 1;
        if (nextLvl <= 10) {
            const nextKey = `map${mapId}_level${nextLvl}`;
            const nextData = allLevels[nextKey];
            if (nextData) {
                setSelectedLevel(nextLvl);
                setLevelData(nextData);
            } else {
                alert('คุณครูยังไม่ได้สร้างด่านต่อไปครับ!');
                setView('levelSelect');
            }
        } else {
            setView('mapSelect');
        }
    };

    return (
        <div className="flex flex-col h-screen p-2 md:p-4 bg-[#a8edea]" ref={gameContainerRef}>
            <style>{engineCSS}</style>
            
            <div className="flex justify-between items-center mb-2 md:mb-4 bg-white/90 backdrop-blur-md p-2 md:p-3 rounded-full shadow-[0_4px_0_#d1d5db] border-2 border-white relative z-20">
                <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 md:px-6 py-1.5 md:py-2 rounded-full font-black text-xs md:text-sm active:translate-y-1 transition-all flex items-center shadow-sm">
                    <i className="fas fa-chevron-left mr-1 md:mr-2"></i> กลับ
                </button>
                
                <div className="text-base md:text-xl font-black text-blue-700 truncate px-4 tracking-wide uppercase drop-shadow-sm">
                    {isSandbox ? 'โหมดฝึกฝน (Sandbox)' : `Map ${mapId} - Level ${levelId}`}
                </div>
                
                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={() => setShowTutorial(true)} className="bg-yellow-100 text-yellow-700 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-black text-xs md:text-sm border-2 border-yellow-300 hover:bg-yellow-200 transition-colors shadow-sm">
                        <i className="fas fa-question-circle"></i>
                    </button>
                    <div className="bg-blue-100 text-blue-800 px-3 md:px-5 py-1.5 md:py-2 rounded-full font-black text-xs md:text-sm border-2 border-blue-200 whitespace-nowrap shadow-sm">
                        ย้าย: <span className="text-base md:text-lg text-blue-600 ml-1">{moves}</span> 
                        {!isSandbox && <span className="hidden md:inline ml-1 text-gray-500 font-bold">/ {levelData?.parMoves || 3}</span>}
                    </div>
                    <button onClick={handleRestart} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-black text-xs md:text-sm active:translate-y-1 transition-all shadow-[0_4px_0_#b91c1c]">
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>

            {isSandbox && (
                <div className="bg-white/95 backdrop-blur-md p-3 md:p-4 rounded-[1.5rem] shadow-md border-4 border-white mb-2 md:mb-4 flex flex-col gap-2 shrink-0 mx-auto max-w-5xl w-full">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center w-full justify-center">
                        <div className="w-full md:w-5/12"><VisualEditor id="sbLhs" label="สมการฝั่งซ้าย" value={sbLhsHtml} onChange={setSbLhsHtml} /></div>
                        <div className="text-3xl md:text-4xl font-black text-gray-300 mt-2 md:mt-4">=</div>
                        <div className="w-full md:w-5/12"><VisualEditor id="sbRhs" label="สมการฝั่งขวา" value={sbRhsHtml} onChange={setSbRhsHtml} /></div>
                    </div>
                    <button onClick={() => { initEngine(sbLhsHtml, sbRhsHtml); setGameState('playing'); }} className="bg-blue-500 text-white font-black py-2.5 px-8 rounded-full text-sm md:text-base self-center transition-all shadow-[0_4px_0_#1d4ed8] active:translate-y-1 mt-2">
                        <i className="fas fa-play mr-2"></i> เล่นสมการนี้
                    </button>
                </div>
            )}

            <div className="flex-1 flex flex-col relative bg-white/60 backdrop-blur-md rounded-[2rem] p-2 md:p-4 border-4 border-white min-h-[40vh] shadow-inner">
                <div id="engine-playground" className="bg-white rounded-2xl md:rounded-[1.5rem] border-2 border-gray-100 shadow-sm flex items-center justify-center p-2 md:p-8 relative w-full h-full flex-1 overflow-x-auto">
                    <div className="w-[1px] bg-gray-300 h-3/4 absolute left-1/2 transform -translate-x-1/2 z-0"></div>
                    <div id="engine-lhs" className="flex-1 h-full flex items-center justify-end pr-2 md:pr-10 gap-1 md:gap-2 z-10 w-1/2 overflow-visible"></div>
                    <div className="engine-equal bg-red-400 text-white rounded-full flex items-center justify-center font-black z-20 shadow-sm flex-shrink-0">=</div>
                    <div id="engine-rhs" className="flex-1 h-full flex items-center justify-start pl-2 md:pl-10 gap-1 md:gap-2 z-10 w-1/2 overflow-visible"></div>
                </div>

                <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-white/95 px-5 py-2 md:px-6 md:py-2.5 rounded-full shadow-[0_4px_0_#d1d5db] border-2 border-gray-200 z-30 whitespace-nowrap">
                    <button onClick={() => engineRef.current.undo()} className="text-gray-600 hover:text-blue-600 text-base md:text-xl active:scale-90 transition-transform"><i className="fas fa-undo"></i></button>
                    <div className="text-gray-500 font-bold border-l-2 pl-3 md:pl-4 text-xs md:text-sm border-gray-200 flex items-center">
                        <i className="fas fa-hand-pointer text-blue-400 mr-1.5 text-lg"></i> ลากวาง <span className="hidden md:inline font-medium text-gray-400 ml-2">| แตะเบิ้ล 2 ครั้งเพื่อแยกส่วน</span>
                    </div>
                </div>
            </div>

            {popupMessage && (
                <div className="absolute bottom-24 md:bottom-32 left-1/2 transform -translate-x-1/2 z-[3000] animate-[slideUpFade_0.3s_ease-out]">
                    <div className="bg-gray-800/90 backdrop-blur-md p-4 md:p-5 rounded-2xl text-center shadow-2xl max-w-sm w-max border-2 border-gray-700 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-3 text-white">
                            <i className="fas fa-exclamation-circle text-red-400 text-2xl"></i>
                            <span className="font-bold text-sm md:text-base">{popupMessage}</span>
                        </div>
                        <button onClick={() => setPopupMessage(null)} className="bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-6 rounded-full text-xs md:text-sm transition-colors w-full">เข้าใจแล้ว</button>
                    </div>
                </div>
            )}

            {/* ป๊อปอัปชนะแบบใหม่ ใหญ่เต็มจอและโชว์คำตอบตรงกลาง! */}
            {gameState === 'won' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[100] animate-[zoomInCenter_0.4s_ease-out] p-4">
                    <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-8 border-green-400 text-center max-w-2xl w-full">
                        <h2 className="text-4xl md:text-6xl font-black text-green-500 mb-2 drop-shadow-md">ยอดเยี่ยม!</h2>
                        <p className="text-gray-500 text-base md:text-xl font-bold mb-6">คุณแก้สมการสำเร็จแล้ว</p>
                        
                        {/* โชว์คำตอบสุดท้าย */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 py-4 px-8 rounded-[2rem] border-2 border-blue-200 mb-8 inline-block shadow-inner">
                            <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-wider">
                                {finalAnswer}
                            </span>
                        </div>
                        
                        {!isSandbox && (
                            <div className="flex gap-2 justify-center mb-10">
                                {[1,2,3,4,5].map(star => <i key={star} className={`fas fa-star text-4xl md:text-6xl ${star <= starsEarned ? 'text-yellow-400 drop-shadow-lg animate-bounce' : 'text-gray-200'}`} style={{animationDelay: `${star * 100}ms`}}></i>)}
                            </div>
                        )}
                        
                        <div className="flex flex-wrap gap-4 justify-center">
                            {isSandbox ? (
                                <button onClick={() => setGameState('playing')} className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-10 rounded-full text-lg md:text-xl shadow-[0_6px_0_#1d4ed8] active:translate-y-[6px] active:shadow-none transition-all">
                                    <i className="fas fa-redo mr-2"></i> ฝึกโจทย์ข้อใหม่
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => setView('levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 md:py-4 px-6 md:px-8 rounded-full text-base md:text-lg shadow-[0_6px_0_#d1d5db] active:translate-y-[6px] active:shadow-none transition-all"><i className="fas fa-bars"></i> กลับเมนู</button>
                                    <button onClick={handleRestart} className="bg-orange-400 hover:bg-orange-500 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-full text-base md:text-lg shadow-[0_6px_0_#c2410c] active:translate-y-[6px] active:shadow-none transition-all"><i className="fas fa-sync-alt"></i> เริ่มใหม่</button>
                                    {levelId < 10 && <button onClick={handleNextLevel} className="flex-1 min-w-[150px] bg-blue-500 hover:bg-blue-600 text-white font-black py-3 md:py-4 px-6 md:px-8 rounded-full text-lg md:text-xl shadow-[0_6px_0_#1d4ed8] active:translate-y-[6px] active:shadow-none transition-all">ด่านต่อไป <i className="fas fa-arrow-right ml-2"></i></button>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showTutorial && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setShowTutorial(false)}>
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative border-4 border-blue-400 transform transition-transform" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl md:text-3xl font-black text-blue-600 mb-4 text-center"><i className="fas fa-book-open mr-2"></i>วิธีเล่น</h2>
                        <ul className="space-y-3 text-sm md:text-base text-gray-700 font-medium">
                            <li className="bg-blue-50 p-3 rounded-2xl border-2 border-blue-100"><strong className="text-blue-600 block mb-1"><i className="fas fa-hand-pointer mr-1"></i> ย้ายข้าง</strong> แตะค้างแล้วลากข้ามเครื่องหมาย = (บวกจะกลายเป็นลบ)</li>
                            <li className="bg-green-50 p-3 rounded-2xl border-2 border-green-100"><strong className="text-green-600 block mb-1"><i className="fas fa-compress-arrows-alt mr-1"></i> รวมพจน์</strong> ลากตัวเลขไปซ้อนทับกันเพื่อคำนวณบวกลบคูณหาร</li>
                            <li className="bg-purple-50 p-3 rounded-2xl border-2 border-purple-100"><strong className="text-purple-600 block mb-1"><i className="fas fa-magic mr-1"></i> แยกร่าง / รวมร่าง</strong> แตะ 2 ครั้งไวๆ ที่ตัวแปร (เช่น 3x) เพื่อแยก หรือแตะ 2 ครั้งที่จุดคูณ (•) เพื่อรวม</li>
                        </ul>
                        <button onClick={() => setShowTutorial(false)} className="mt-5 w-full bg-blue-500 text-white font-black py-3 rounded-2xl text-lg shadow-[0_4px_0_#1d4ed8] active:translate-y-1 transition-all">เข้าใจแล้ว ลุย!</button>
                    </div>
                </div>
            )}
        </div>
    );
}
