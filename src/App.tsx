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
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-center p-6 text-white font-['Kanit']">
                <i className="fas fa-mobile-alt text-6xl md:text-8xl mb-4 md:mb-6 animate-pulse"></i>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 shadow-sm">กรุณาหมุนโทรศัพท์</h1>
                <p className="text-lg md:text-xl opacity-90">ตะแคงจอเป็นแนวนอน เพื่อเข้าสู่เกมครับ</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gradient-to-br from-[#84fab0] to-[#8fd3f4] font-['Kanit'] overflow-hidden relative selection:bg-blue-300">
            {/* Compact Header User for Mobile */}
            {user && view !== 'play' && view !== 'sandbox' && (
                <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center gap-2 md:gap-4 bg-white/60 backdrop-blur-md px-3 py-1 md:px-6 md:py-2 rounded-full shadow-md border border-white/50 z-50">
                    <div className="text-sm md:text-lg font-bold text-gray-800 flex items-center">
                        <i className="fas fa-star text-yellow-500 mr-1 md:mr-2"></i> {userData?.totalStars || 0}
                    </div>
                    <div className="text-xs md:text-md text-gray-800 border-l-2 pl-2 md:pl-4 border-gray-400/50 font-medium flex items-center">
                        <i className="fas fa-user-circle text-blue-600 mr-1 md:mr-2"></i> {userData?.displayName}
                    </div>
                    <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 text-xs md:text-md ml-1 md:ml-3 bg-red-100 hover:bg-red-200 px-2 py-1 md:px-3 md:py-1 rounded-full transition-colors">
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
        } catch (err) { setError('ข้อมูลไม่ถูกต้อง หรือรหัสผ่านสั้นเกินไป'); }
    };

    return (
        <div className="flex h-screen items-center justify-center p-2 md:p-4">
            <div className="bg-white/40 backdrop-blur-xl p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-xl border border-white/50 max-w-sm w-full text-center relative overflow-hidden">
                <div className="text-5xl md:text-7xl mb-4 text-blue-600"><i className="fas fa-brain"></i></div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-gray-800 mb-1">Smart Fast-Math AI</h1>
                <h2 className="text-sm md:text-lg text-gray-700 font-medium mb-6 bg-white/50 inline-block px-3 py-1 rounded-full border border-white/60">โดย ครูจักรวรรดิ ไชยโคตร</h2>
                
                {error && <div className="bg-red-500/90 text-white p-2 rounded-xl mb-3 text-xs md:text-sm">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-4 relative z-10">
                    <input type="email" placeholder="อีเมลของคุณ" required value={email} onChange={e => setEmail(e.target.value)}
                        className="px-4 py-2 md:py-3 rounded-xl bg-white/80 border border-white/50 focus:bg-white outline-none text-sm md:text-base" />
                    <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={e => setPassword(e.target.value)}
                        className="px-4 py-2 md:py-3 rounded-xl bg-white/80 border border-white/50 focus:bg-white outline-none text-sm md:text-base" />
                    <button type="submit" className="bg-gradient-to-b from-blue-400 to-blue-600 text-white font-extrabold py-2 md:py-3 rounded-xl shadow-[0_4px_0_#1e3a8a] active:translate-y-[4px] active:shadow-none text-base md:text-xl mt-2">
                        {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-4 md:mt-6 text-sm text-gray-700 font-bold hover:text-blue-700 bg-white/40 px-4 py-1 rounded-full border border-white/50">
                    {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                </button>
            </div>
        </div>
    );
}

function MainMenu({ setView, isAdmin }) {
    return (
        <div className="flex h-screen items-center justify-center p-2 md:p-6">
            <div className="bg-white/50 backdrop-blur-xl p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-white/60 w-full max-w-3xl text-center">
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 mb-6 md:mb-10">
                    <i className="fas fa-rocket text-blue-600 mr-2 md:mr-4"></i>เลือกโหมด
                </h1>
                <div className="grid grid-cols-2 gap-4 md:gap-8">
                    <MenuButton icon="fa-play" text="ลุยด่าน (Campaign)" color="from-green-400 to-emerald-600" shadowColor="#047857" onClick={() => setView('mapSelect')} />
                    <MenuButton icon="fa-dumbbell" text="ฝึกฝน (Sandbox)" color="from-orange-400 to-red-500" shadowColor="#991b1b" onClick={() => setView('sandbox')} />
                    <MenuButton icon="fa-crown" text="ตารางอันดับ" color="from-yellow-300 to-amber-500" shadowColor="#b45309" onClick={() => setView('leaderboard')} colSpan={isAdmin ? 1 : 2} />
                    {isAdmin && <MenuButton icon="fa-tools" text="Admin" color="from-gray-600 to-gray-800" shadowColor="#1f2937" onClick={() => setView('admin')} />}
                </div>
            </div>
        </div>
    );
}

function MenuButton({ icon, text, color, shadowColor, onClick, colSpan = 1 }) {
    return (
        <button onClick={onClick} className={`bg-gradient-to-b ${color} text-white font-extrabold py-4 px-2 md:py-6 md:px-4 rounded-2xl md:rounded-3xl shadow-[0_4px_0_${shadowColor},0_10px_15px_rgba(0,0,0,0.2)] md:shadow-[0_8px_0_${shadowColor},0_15px_20px_rgba(0,0,0,0.3)] transform transition-all active:translate-y-[4px] md:active:translate-y-[8px] active:shadow-none text-sm md:text-2xl flex flex-col items-center justify-center gap-2 md:gap-4 hover:brightness-110 col-span-${colSpan} border border-white/20`}>
            <i className={`fas ${icon} text-3xl md:text-5xl drop-shadow-md`}></i> {text}
        </button>
    );
}

function MapSelect({ setView, setSelectedMap, userProgress }) {
    const maps = Array.from({ length: 10 }, (_, i) => i + 1);
    const isMapUnlocked = (m) => m === 1 || (userProgress[`map${m - 1}_level10`]?.stars || 0) > 0;

    return (
        <div className="p-4 md:p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('menu')} className="bg-white/80 px-4 py-2 rounded-full mb-4 md:mb-6 font-bold text-gray-800 shadow text-sm md:text-lg"><i className="fas fa-chevron-left mr-1 md:mr-2"></i> กลับ</button>
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-800 mb-6 md:mb-10 text-center bg-white/70 py-2 md:py-4 rounded-full max-w-[200px] md:max-w-md mx-auto shadow-md border-2 border-white/80">เลือก Map</h1>
            <div className="grid grid-cols-5 gap-3 md:gap-6 max-w-5xl mx-auto pb-10">
                {maps.map(mapNum => {
                    const unlocked = isMapUnlocked(mapNum);
                    return (
                        <button key={mapNum} disabled={!unlocked} onClick={() => { setSelectedMap(mapNum); setView('levelSelect'); }}
                            className={`relative flex flex-col items-center justify-center h-20 md:h-32 rounded-xl md:rounded-[2rem] border-2 md:border-4 transition-all ${unlocked ? 'bg-white border-blue-400 shadow-[0_4px_0_#60a5fa] active:translate-y-[4px] active:shadow-none cursor-pointer' : 'bg-gray-200 border-gray-300 opacity-70 cursor-not-allowed'}`}>
                            <span className={`text-xs md:text-2xl font-black ${unlocked ? 'text-blue-500' : 'text-gray-500'}`}>Map</span>
                            <span className={`text-xl md:text-4xl font-black ${unlocked ? 'text-blue-700' : 'text-gray-500'}`}>{mapNum}</span>
                            {!unlocked && <div className="absolute inset-0 bg-black/5 rounded-xl md:rounded-[1.75rem] flex items-center justify-center"><i className="fas fa-lock text-gray-500/50 text-xl md:text-4xl"></i></div>}
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
        <div className="p-4 md:p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('mapSelect')} className="bg-white/80 px-4 py-2 rounded-full mb-4 md:mb-6 font-bold text-gray-800 shadow text-sm md:text-lg"><i className="fas fa-chevron-left mr-1 md:mr-2"></i> กลับ</button>
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-800 mb-6 md:mb-10 text-center bg-white/70 py-2 md:py-4 rounded-full max-w-[250px] md:max-w-md mx-auto shadow-md border-2 border-white/80">Map {mapId}</h1>
            <div className="grid grid-cols-5 gap-3 md:gap-6 max-w-5xl mx-auto pb-10">
                {levels.map(lvlNum => {
                    const levelKey = `map${mapId}_level${lvlNum}`;
                    const levelExists = allLevels[levelKey];
                    const unlocked = isLevelUnlocked(lvlNum) && levelExists;
                    const stars = userProgress[levelKey]?.stars || 0;
                    return (
                        <button key={lvlNum} disabled={!unlocked && levelExists} onClick={() => { if(levelExists) { setSelectedLevel(lvlNum); setLevelData(allLevels[levelKey]); setView('play'); } else alert("ยังไม่เปิดให้เล่นครับ"); }}
                            className={`relative flex flex-col items-center justify-center h-20 md:h-32 rounded-xl md:rounded-[1.5rem] border-2 md:border-4 transition-all ${unlocked ? 'bg-white border-green-500 shadow-[0_4px_0_#22c55e] active:translate-y-[4px] active:shadow-none cursor-pointer' : (!levelExists ? 'bg-red-50 border-red-200' : 'bg-gray-200 border-gray-300 opacity-80 cursor-not-allowed')}`}>
                            <span className={`text-2xl md:text-5xl font-black ${unlocked ? 'text-green-600' : 'text-gray-400'}`}>{lvlNum}</span>
                            <div className="flex gap-[1px] md:gap-1 mt-1 md:mt-2 bg-white/80 px-1 md:px-2 py-[2px] rounded-full shadow-inner">
                                {[1,2,3,4,5].map(star => <i key={star} className={`fas fa-star text-[8px] md:text-xs ${star <= stars ? 'text-yellow-400' : 'text-gray-300'}`}></i>)}
                            </div>
                            {!unlocked && levelExists && <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-xl"><i className="fas fa-lock text-gray-500/50 text-xl md:text-3xl"></i></div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

// ==========================================
// PURE DOM VISUAL EDITOR (Fix for Mobile & React Focus loss)
// ==========================================
function VisualEditor({ id, label, value, onChange }) {
    const editorRef = useRef(null);
    const [localValue, setLocalValue] = useState(value);

    // Initialize content only once
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML === '') {
            editorRef.current.innerHTML = value || '';
        }
    }, []);

    const updateReactState = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setLocalValue(html);
            onChange(html);
        }
    };

    // Mobile-safe cursor insertion
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
            } else {
                el.insertAdjacentHTML('beforeend', htmlString);
            }
        } else {
            el.insertAdjacentHTML('beforeend', htmlString);
        }
        updateReactState();
    };

    const insertFraction = (e) => {
        e.preventDefault();
        insertHTML(`<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true"></span><div class="frac-line"></div><span class="frac-den" contenteditable="true"></span></span>&nbsp;`);
    };

    const insertText = (e, text) => {
        e.preventDefault();
        insertHTML(text);
    };

    const clearEditor = (e) => {
        e.preventDefault();
        if(editorRef.current) {
            editorRef.current.innerHTML = '';
            updateReactState();
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full max-w-full">
            <div className="flex justify-center gap-1 md:gap-2 flex-wrap bg-gray-100 p-1 md:p-2 rounded-xl md:rounded-2xl border border-gray-200">
                <button onMouseDown={insertFraction} onTouchStart={insertFraction} className="bg-white border-2 border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 font-bold text-xs md:text-sm active:bg-blue-100 whitespace-nowrap"><i className="fas fa-columns rotate-90 mr-1 text-blue-500"></i>เศษส่วน</button>
                <button onMouseDown={e=>insertText(e,'•')} onTouchStart={e=>insertText(e,'•')} className="bg-white border-2 border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 font-bold text-xs md:text-sm active:bg-blue-100 whitespace-nowrap"><i className="fas fa-circle text-[8px] mr-1 text-purple-500"></i>คูณ(•)</button>
                <button onMouseDown={e=>insertText(e,'x')} onTouchStart={e=>insertText(e,'x')} className="bg-white border-2 border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 font-bold text-xs md:text-sm text-green-600 active:bg-blue-100 whitespace-nowrap">ตัวแปร x</button>
                <button onMouseDown={e=>insertText(e,'+')} onTouchStart={e=>insertText(e,'+')} className="bg-white border-2 border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 font-bold text-xs md:text-sm active:bg-blue-100">+</button>
                <button onMouseDown={e=>insertText(e,'-')} onTouchStart={e=>insertText(e,'-')} className="bg-white border-2 border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 font-bold text-xs md:text-sm active:bg-blue-100">-</button>
                <button onMouseDown={clearEditor} onTouchStart={clearEditor} className="bg-white border-2 border-red-200 text-red-500 rounded-lg px-2 py-1 md:px-3 md:py-2 font-bold text-xs md:text-sm active:bg-red-100 whitespace-nowrap"><i className="fas fa-trash-alt mr-1"></i>ล้าง</button>
            </div>
            
            <div className="w-full">
                <label className="block text-gray-700 font-extrabold mb-1 text-sm md:text-lg text-center">{label}</label>
                <div 
                    id={id}
                    ref={editorRef}
                    className="bg-white border-2 md:border-4 border-blue-200 rounded-xl md:rounded-2xl p-2 md:p-4 flex items-center min-h-[50px] md:min-h-[70px] font-['Fredoka'] text-xl md:text-3xl color-gray-700 overflow-x-auto whitespace-nowrap cursor-text outline-none focus:border-blue-400 w-full"
                    contentEditable="true"
                    onInput={updateReactState}
                    onBlur={updateReactState}
                    suppressContentEditableWarning={true}
                ></div>
            </div>
        </div>
    );
}

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
            setLhsHtml(data.lhsHtml || ''); setRhsHtml(data.rhsHtml || ''); setParMoves(data.parMoves);
            const lhsEl = document.getElementById('adminLhs'); const rhsEl = document.getElementById('adminRhs');
            if(lhsEl) lhsEl.innerHTML = data.lhsHtml || ''; if(rhsEl) rhsEl.innerHTML = data.rhsHtml || '';
        } else {
            setLhsHtml(''); setRhsHtml(''); setParMoves(3);
            const lhsEl = document.getElementById('adminLhs'); const rhsEl = document.getElementById('adminRhs');
            if(lhsEl) lhsEl.innerHTML = ''; if(rhsEl) rhsEl.innerHTML = '';
        }
        setMessage('');
    }, [mapId, levelId, allLevels]);

    const handleSave = async () => {
        if (!lhsHtml || !rhsHtml) { setMessage('กรุณาสร้างสมการให้ครบ'); return; }
        const levelKey = `map${mapId}_level${levelId}`;
        await set(ref(db, `levels/${levelKey}`), { mapId, levelId, lhsHtml, rhsHtml, parMoves: parseInt(parMoves) });
        setMessage(`บันทึก Map ${mapId} เลเวล ${levelId} เรียบร้อย!`);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="p-2 md:p-8 h-screen overflow-y-auto flex justify-center items-center">
            <div className="bg-white/90 backdrop-blur-xl p-4 md:p-8 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-white w-full max-w-4xl">
                <div className="flex justify-between items-center mb-4 md:mb-6 bg-gray-800 text-white p-2 md:p-4 rounded-xl md:rounded-3xl">
                    <h1 className="text-xl md:text-3xl font-extrabold ml-2 md:ml-4"><i className="fas fa-tools text-yellow-400 mr-2"></i>Admin</h1>
                    <button onClick={() => setView('menu')} className="bg-white/20 px-3 py-1 md:px-6 md:py-2 rounded-full font-bold hover:bg-white hover:text-gray-900 text-sm md:text-base">กลับเมนู</button>
                </div>
                
                <div className="flex gap-2 md:gap-6 mb-4 md:mb-6 bg-blue-50 p-2 md:p-4 rounded-xl md:rounded-2xl">
                    <div className="flex-1">
                        <label className="block text-gray-700 font-bold text-xs md:text-sm">Map</label>
                        <select value={mapId} onChange={e => setMapId(parseInt(e.target.value))} className="w-full p-2 md:p-3 rounded-lg border-2 border-blue-200 text-sm md:text-xl font-bold bg-white">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Map {n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-gray-700 font-bold text-xs md:text-sm">Level</label>
                        <select value={levelId} onChange={e => setLevelId(parseInt(e.target.value))} className="w-full p-2 md:p-3 rounded-lg border-2 border-blue-200 text-sm md:text-xl font-bold bg-white">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Level {n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-gray-700 font-bold text-xs md:text-sm">เป้าหมาย (ครั้ง)</label>
                        <input type="number" value={parMoves} onChange={e => setParMoves(e.target.value)} min="1" className="w-full p-2 md:p-3 rounded-lg border-2 border-blue-200 text-sm md:text-xl font-bold bg-white text-center" />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-center w-full mb-4 md:mb-8">
                    <VisualEditor id="adminLhs" label="ฝั่งซ้าย (LHS)" value={lhsHtml} onChange={setLhsHtml} />
                    <div className="text-3xl md:text-5xl font-black text-gray-400">=</div>
                    <VisualEditor id="adminRhs" label="ฝั่งขวา (RHS)" value={rhsHtml} onChange={setRhsHtml} />
                </div>

                {message && <div className={`p-2 md:p-4 rounded-xl mb-4 font-bold text-center text-sm md:text-xl ${message.includes('เรียบร้อย') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

                <button onClick={handleSave} className="w-full bg-green-500 text-white font-extrabold py-3 md:py-4 rounded-xl md:rounded-2xl text-lg md:text-2xl shadow-[0_4px_0_#166534] active:translate-y-[4px] active:shadow-none">
                    <i className="fas fa-save mr-2"></i> บันทึกด่าน
                </button>
            </div>
        </div>
    );
}

function Leaderboard({ setView, leaderboard }) {
    return (
        <div className="p-4 md:p-8 h-screen flex justify-center items-center">
            <div className="bg-white/80 backdrop-blur-xl p-4 md:p-8 rounded-2xl md:rounded-[3rem] shadow-xl border border-white max-w-2xl w-full h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 md:mb-6 bg-gradient-to-r from-amber-400 to-orange-500 p-3 md:p-6 rounded-xl md:rounded-3xl">
                    <h1 className="text-xl md:text-3xl font-extrabold text-white"><i className="fas fa-crown text-yellow-200 mr-2"></i>ตารางอันดับ</h1>
                    <button onClick={() => setView('menu')} className="bg-white/20 text-white px-3 py-1 md:px-6 md:py-2 rounded-full font-bold text-sm md:text-base">กลับ</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 md:space-y-4 pr-2">
                    {leaderboard.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10 text-lg md:text-xl font-bold">ยังไม่มีข้อมูลผู้เล่น</div>
                    ) : (
                        leaderboard.map((u, index) => (
                            <div key={u.id} className={`flex items-center justify-between p-3 md:p-5 rounded-xl md:rounded-2xl border-2 shadow-sm ${index === 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-200'}`}>
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-sm md:text-xl ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{index + 1}</div>
                                    <div className="text-sm md:text-xl font-bold text-gray-800">{u.displayName}</div>
                                </div>
                                <div className="text-lg md:text-2xl font-black text-gray-800">{u.totalStars} <i className="fas fa-star text-yellow-400"></i></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// THE CORE GAME ENGINE WRAPPER (Responsive + Mobile Touch Fixes)
// ==========================================
function GameEngine({ view, setView, levelData, mapId, levelId, saveProgress }) {
    const gameContainerRef = useRef(null);
    const [moves, setMoves] = useState(0);
    const [gameState, setGameState] = useState('playing'); 
    const [starsEarned, setStarsEarned] = useState(0);
    const [showTutorial, setShowTutorial] = useState(false);
    
    const isSandbox = view === 'sandbox';
    const [sbLhsHtml, setSbLhsHtml] = useState('<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true">x</span><div class="frac-line"></div><span class="frac-den" contenteditable="true">2</span></span>');
    const [sbRhsHtml, setSbRhsHtml] = useState('10');

    const engineRef = useRef({
        localGameState: { lhs: [], rhs: [] },
        historyStack: [], historyIndex: -1, internalMoveCount: 0, dragSrc: null, audioCtx: null
    });

    // Responsive CSS using clamp and viewport units for Mobile fit
    const engineCSS = `
        .term-container { display: inline-flex; align-items: center; margin: 0 1vw; transition: all 0.2s; }
        .term-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: clamp(4px, 1.5vw, 10px) clamp(8px, 2vw, 16px); background: white; color: #4a5568; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: clamp(1rem, 3.5vw, 1.8rem); border-radius: clamp(8px, 2vw, 16px); cursor: grab; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 2px solid #e2e8f0; min-width: clamp(35px, 6vw, 60px); user-select: none; }
        .term-card.is-variable { background: #4FACFE; color: white; border-color: #00f2fe; }
        .term-card.is-number { background: linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%); color: white; border-color: #fff; }
        .term-card.is-operator { background: transparent; box-shadow: none; border: none; color: #718096; font-size: clamp(1.2rem, 3vw, 1.5rem); padding: 0 2px; min-width: auto; }
        .term-card.is-operator.draggable-negative { cursor: grab; color: #e53e3e; font-weight: bold; }
        .term-card:active { transform: scale(0.95); }
        .fraction-group { display: inline-flex; flex-direction: column; align-items: center; margin: 0 4px; background: rgba(255,255,255,0.5); padding: clamp(4px, 1vw, 8px); border-radius: clamp(8px, 1.5vw, 16px); border: 2px dashed #cbd5e0; cursor: grab;}
        .fraction-line { width: 100%; height: 2px; background-color: #4a5568; margin: 4px 0; }
        .numerator-container, .denominator-container { display: flex; align-items: center; justify-content: center; padding: 2px; min-height: clamp(25px, 5vw, 45px); }
        .group-bracket { color: #94a3b8; font-size: clamp(2rem, 6vw, 3.5rem); font-weight: 300; line-height: 0.8; font-family: 'Kanit'; }
        .dragging-ghost { opacity: 0.8; position: fixed; z-index: 9999; pointer-events: none; transform: scale(1.1); box-shadow: 0 10px 15px rgba(0,0,0,0.2); }
        .editor-fraction { display: inline-flex; flex-direction: column; align-items: center; margin: 0 2px; background: #f7fafc; border-radius: 6px; padding: 2px; border: 1px dashed #cbd5e0; }
        .frac-num, .frac-den { min-width: 15px; min-height: 20px; text-align: center; padding: 0 2px; background: white; border-radius: 4px; outline:none; border: 1px solid #e2e8f0;}
        .frac-line { width: 100%; height: 2px; background: #4a5568; margin: 2px 0; }
    `;

    const initEngine = (lhsHtmlSource, rhsHtmlSource) => {
        const eng = engineRef.current;
        eng.internalMoveCount = 0; setMoves(0); eng.historyStack = []; eng.historyIndex = -1;
        if(!eng.audioCtx) eng.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Parser
        const parseHTMLtoMath = (htmlString) => {
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

        // Utilities
        eng.gcd = (a, b) => b === 0 ? a : eng.gcd(b, a % b);
        eng.lcm = (a, b) => { if (a === 0 || b === 0) return 0; return Math.abs((a * b) / eng.gcd(a, b)); }
        eng.playTone = (type) => { /* Tone logic simplified for space, assuming success/error beeps */ };
        eng.showPopup = (msg) => alert(msg);
        eng.shakeElement = (el) => { el.style.transform = 'translateX(5px)'; setTimeout(()=>el.style.transform='none', 200); }

        // Core Logic hooks
        eng.commitState = () => {
            for(let k=0; k<2; k++) { eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs); eng.unwrapGroups(eng.localGameState.lhs); eng.unwrapGroups(eng.localGameState.rhs); }
            eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs);
            eng.historyStack.push(JSON.parse(JSON.stringify(eng.localGameState))); eng.historyIndex++; eng.render(); eng.checkWinCondition();
        };
        eng.undo = () => { if (eng.historyIndex > 0) { eng.historyIndex--; eng.localGameState = JSON.parse(JSON.stringify(eng.historyStack[eng.historyIndex])); eng.render(); } };
        
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

        // Render & Touch Handlers
        eng.render = () => {
            const lhsZone = document.getElementById('engine-lhs'), rhsZone = document.getElementById('engine-rhs');
            if(lhsZone) { lhsZone.innerHTML = ''; eng.localGameState.lhs.forEach((t, i) => lhsZone.appendChild(eng.createTermElement(t, 'lhs', eng.localGameState.lhs, i, 0))); }
            if(rhsZone) { rhsZone.innerHTML = ''; eng.localGameState.rhs.forEach((t, i) => rhsZone.appendChild(eng.createTermElement(t, 'rhs', eng.localGameState.rhs, i, 0))); }
        };

        // Double Tap Logic Helper
        let lastTap = 0;
        const handleTap = (e, action) => {
            let now = new Date().getTime();
            if (now - lastTap < 300 && now - lastTap > 0) { e.preventDefault(); action(); lastTap = 0; } else { lastTap = now; }
        };

        eng.createTermElement = (term, side, list, idx, depth) => {
            let wrapper = document.createElement('div'); wrapper.className = 'term-container'; wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            if (term.type === 'op') {
                let card = document.createElement('div'); card.className = 'term-card is-operator'; card.innerText = term.value;
                if (term.value === '•') { 
                    card.ondblclick = (e) => { e.stopPropagation(); eng.combineSplitTerm(term, list, idx); }; 
                    card.ontouchend = (e) => { e.stopPropagation(); handleTap(e, () => eng.combineSplitTerm(term, list, idx)); };
                } 
                else if (term.value === '-' && idx < list.length - 1 && (list[idx+1].type === 'group' || list[idx+1].type === 'fraction')) { card.classList.add('draggable-negative'); eng.setupDrag(card, term, side, list, idx, 'distribute-negative'); }
                wrapper.appendChild(card);
            } else if (term.type === 'group') {
                let br = (depth % 3 === 0) ? ['(', ')'] : (depth % 3 === 1) ? ['[', ']'] : ['{', '}'];
                let lB = document.createElement('div'); lB.innerText = br[0]; lB.className = 'group-bracket';
                let rB = document.createElement('div'); rB.innerText = br[1]; rB.className = 'group-bracket';
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
                fracGroup.ondblclick = (e) => { e.stopPropagation(); eng.splitFraction(term, list, idx); };
                fracGroup.ontouchend = (e) => { e.stopPropagation(); handleTap(e, () => eng.splitFraction(term, list, idx)); };
                eng.setupDrag(fracGroup, term, side, list, idx, 'whole-fraction'); wrapper.appendChild(fracGroup); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else {
                let card = document.createElement('div'); card.className = term.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number'; card.innerText = term.value;
                card.ondblclick = (e) => { e.stopPropagation(); eng.splitTerm(term, list, idx); };
                card.ontouchend = (e) => { e.stopPropagation(); handleTap(e, () => eng.splitTerm(term, list, idx)); };
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
                    if(child.value === '•' && list) { 
                        el.ondblclick = (e) => { e.stopPropagation(); eng.combineSplitTerm(child, list, childIdx); eng.commitState(); }; 
                        el.ontouchend = (e) => { e.stopPropagation(); handleTap(e, () => { eng.combineSplitTerm(child, list, childIdx); eng.commitState(); }); };
                    }
                    else if (child.value === '-' && list && childIdx < list.length - 1 && list[childIdx+1].type === 'group') { el.classList.add('draggable-negative'); eng.setupDrag(el, child, side, list, childIdx, 'distribute-negative', parentFracTerm, mainList, mainIdx, context); }
                } else {
                    el.className = (child.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number') + ' px-1 py-1 min-w-[20px] ' + context + '-term'; el.innerText = child.value; el.dataset.parentFracId = parentId; 
                    if(list) el.dataset.childIdx = childIdx;
                    if (context === 'denominator' && !list) { el.dataset.childIdx = 0; eng.setupDrag(el, parentFracTerm, null, mainList, mainIdx, 'denominator', null, null, null, context); } 
                    else if(list) { 
                        el.ondblclick = (e) => { e.stopPropagation(); eng.splitTerm(child, list, childIdx); }; 
                        el.ontouchend = (e) => { e.stopPropagation(); handleTap(e, () => eng.splitTerm(child, list, childIdx)); };
                        eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context); 
                    }
                }
            }
            if (el && list) el.dataset.side = side;
            return el;
        };

        eng.setupDrag = (el, term, side, list, idx, role, parentFracTerm = null, mainList = null, mainIdx = null, sourceContext = null) => {
            const handleStart = (clientX, clientY, eOriginal) => {
                eOriginal.stopPropagation(); eOriginal.preventDefault();
                eng.internalMoveCount++; setMoves(eng.internalMoveCount);
                eng.dragSrc = { el, term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext };
                let ghost = el.cloneNode(true); ghost.classList.add('dragging-ghost'); ghost.style.width = el.offsetWidth + 'px'; 
                document.body.appendChild(ghost); eng.dragSrc.ghost = ghost;
                
                const moveGhost = (x, y) => { eng.dragSrc.ghost.style.left = (x - eng.dragSrc.ghost.offsetWidth/2) + 'px'; eng.dragSrc.ghost.style.top = (y - eng.dragSrc.ghost.offsetHeight/2) + 'px'; };
                moveGhost(clientX, clientY);
                
                const onMove = (ev) => { let cx = ev.clientX ?? ev.touches?.[0]?.clientX; let cy = ev.clientY ?? ev.touches?.[0]?.clientY; if(cx && cy) moveGhost(cx, cy); };
                const onEnd = (ev) => {
                    document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                    if (!eng.dragSrc) return;
                    let endX = ev.clientX ?? ev.changedTouches?.[0]?.clientX; let endY = ev.clientY ?? ev.changedTouches?.[0]?.clientY;
                    
                    let pg = document.getElementById('engine-playground');
                    if(pg && endX && endY) {
                        let rect = pg.getBoundingClientRect(), midX = rect.left + rect.width/2;
                        let isGlobalMove = (role === 'term' || role === 'denominator' || role === 'whole-fraction');
                        let currentSide = eng.dragSrc.side || (eng.dragSrc.list === eng.localGameState.lhs ? 'lhs' : (eng.dragSrc.list === eng.localGameState.rhs ? 'rhs' : null));
                        let crossRight = currentSide === 'lhs' && endX > midX + 30, crossLeft = currentSide === 'rhs' && endX < midX - 30;
                        
                        if (isGlobalMove && (crossRight || crossLeft)) {
                            eng.dragSrc.side = currentSide; eng.executeMoveSide();
                        } else {
                            eng.dragSrc.ghost.style.display = 'none'; let elemBelow = document.elementFromPoint(endX, endY); eng.dragSrc.ghost.style.display = 'block';
                            if (role === 'distribute-negative') {
                                let cItem = eng.dragSrc.el.closest('.term-container'); let nItem = cItem ? cItem.nextElementSibling : null;
                                if (nItem && (nItem === elemBelow || nItem.contains(elemBelow))) { eng.distributeNegative(eng.dragSrc.term, eng.dragSrc.list, eng.dragSrc.idx); }
                            } else {
                                let targetWrapper = elemBelow ? elemBelow.closest('.term-container') : null;
                                if (targetWrapper && targetWrapper !== eng.dragSrc.el.closest('.term-container')) eng.tryCombine(targetWrapper, elemBelow); 
                            }
                        }
                    }
                    if (eng.dragSrc && eng.dragSrc.ghost) eng.dragSrc.ghost.remove(); eng.dragSrc = null;
                };

                document.addEventListener('mousemove', onMove, {passive: false}); document.addEventListener('touchmove', onMove, {passive: false});
                document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
            };
            el.onmousedown = (e) => { if(e.button === 0) handleStart(e.clientX, e.clientY, e); };
            el.ontouchstart = (e) => { if(e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY, e); };
        };

        // Execution Logistics
        eng.executeMoveSide = () => {
            let { term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext } = eng.dragSrc;
            if (role === 'inner-term' && parentFracTerm && list.length === 1) { term = parentFracTerm; list = mainList; idx = mainIdx; role = 'denominator'; }
            if (!list) return; let targetList = side === 'lhs' ? eng.localGameState.rhs : eng.localGameState.lhs;
            
            if (role === 'denominator') {
                if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) return eng.showPopup("รวมเศษส่วนก่อนย้ายตัวหารครับ");
                list.splice(idx, 1, new eng.TermClass('group', null, JSON.parse(JSON.stringify(term.children))));
                if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                let val = term.denominator.value || "1";
                if(term.denominator.type === 'group' && term.denominator.children.length === 1) targetList.push(new eng.TermClass('op', '•'), term.denominator.children[0]);
                else if (term.denominator.type === 'group') targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('group', null, term.denominator.children));
                else targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', val));
            } else {
                let isFactor = false, removeIdx = idx, removeCount = 1, nextTerm = (idx < list.length - 1) ? list[idx+1] : null, prevTerm = (idx > 0) ? list[idx-1] : null;
                if (nextTerm && nextTerm.value === '•') { isFactor = true; removeCount = 2; } else if (prevTerm && prevTerm.value === '•') { isFactor = true; removeIdx = idx - 1; removeCount = 2; }
                if (isFactor || sourceContext === 'denominator') {
                    if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) return eng.showPopup("กำจัดบวกลบก่อนย้ายตัวคูณครับ");
                    let moveValue = term.value;
                    if(idx === 1 && list[0].type === 'op' && (list[0].value === '-' || list[0].value === '+')) { if(list[0].value === '-') moveValue = '-' + moveValue; removeIdx = 0; removeCount += 1; }
                    list.splice(removeIdx, removeCount);
                    if (sourceContext === 'denominator') {
                        if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                        targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', moveValue));
                    } else {
                        let num = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('fraction', null, num, new eng.TermClass('term', moveValue)));
                    }
                } else {
                    let movingSign = '+'; if (idx > 0 && list[idx-1].type === 'op') { movingSign = list[idx-1].value; removeIdx = idx - 1; removeCount = 2; }
                    list.splice(removeIdx, removeCount); if(list.length > 0 && list[0].type === 'op' && (list[0].value === '+' || list[0].value === '•')) list.shift();
                    let newSign = movingSign === '+' ? '-' : '+';
                    if (targetList.length > 0) targetList.push(new eng.TermClass('op', newSign)); else if (newSign === '-') targetList.push(new eng.TermClass('op', '-'));
                    targetList.push(term);
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
                    if ((min > 0 && list[min-1].value === '•') || (max < list.length-1 && list[max+1].value === '•')) return eng.showPopup("ติดตัวคูณอยู่ครับ");
                    let parseVar = (v) => { if(typeof v!=='string') return null; let m=v.match(/^(-?\d*)([a-zA-Z]+)$/); if(m) return {c: m[1]===''?1:(m[1]==='-'?-1:parseInt(m[1])), v: m[2]}; if(!isNaN(v)) return {c: parseInt(v), v: null}; return null; };
                    let p1 = parseVar(list[min].value), p2 = parseVar(list[max].value);
                    if (p1 && p2 && p1.v === p2.v) {
                        let s1 = (min > 0 && list[min-1].value === '-') ? -1 : 1, s2 = op.value === '-' ? -1 : 1;
                        let res = (p1.c * s1) + (p2.c * s2);
                        list.splice(min, 3, new eng.TermClass('term', res + (p1.v || '')));
                        eng.commitState(); return;
                    }
                } else if (op && op.value === '•') {
                     let p1 = parseInt(list[min].value), p2 = parseInt(list[max].value);
                     if(!isNaN(p1) && !isNaN(p2)) { list.splice(min, 3, new eng.TermClass('term', (p1*p2).toString())); eng.commitState(); return; }
                }
            }
        };

        eng.splitFraction = (term, list, idx) => { let nt = []; term.children.forEach(t => nt.push(t)); list.splice(idx, 1, ...nt); eng.commitState(); };
        eng.splitTerm = (term, list, idx) => { let m = term.value.match(/^(-?\d+)([a-zA-Z]+)$/); if(m) { list.splice(idx, 1, new eng.TermClass('term', m[1]), new eng.TermClass('op', '•'), new eng.TermClass('term', m[2])); eng.commitState(); }};
        eng.combineSplitTerm = (term, list, idx) => { if(idx>0 && idx<list.length-1) { list.splice(idx-1, 3, new eng.TermClass('term', list[idx-1].value + list[idx+1].value)); eng.commitState(); } };
        eng.distributeNegative = (term, list, idx) => { if(idx >= list.length-1) return; let t = list[idx+1]; if(t.type==='group') { list[idx].value='+'; list.splice(idx+1, 1, ...t.children); eng.commitState(); } };

        eng.checkWinCondition = () => {
            const isSolved = (list) => list.length === 1 && list[0].type === 'term' && (list[0].value === 'x' || list[0].value === '1x');
            const isNum = (list) => list.length === 1 && list[0].type === 'term' && !isNaN(list[0].value);
            if ((isSolved(eng.localGameState.lhs) && isNum(eng.localGameState.rhs)) || (isSolved(eng.localGameState.rhs) && isNum(eng.localGameState.lhs))) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#4ade80', '#3b82f6', '#fbbf24'] });
                setGameState('won');
                if (!isSandbox) {
                    let calcStars = (eng.internalMoveCount <= levelData?.parMoves) ? 5 : (eng.internalMoveCount === levelData?.parMoves+1 ? 4 : (eng.internalMoveCount === levelData?.parMoves+2 ? 3 : (eng.internalMoveCount === levelData?.parMoves+3 ? 2 : 1)));
                    setStarsEarned(calcStars); saveProgress(mapId, levelId, calcStars);
                }
            }
        };

        eng.commitState();
    };

    useEffect(() => {
        if (!isSandbox && levelData) { initEngine(levelData.lhsHtml || levelData.lhs, levelData.rhsHtml || levelData.rhs); } 
        else if (isSandbox) { initEngine(sbLhsHtml, sbRhsHtml); }
        return () => { if(engineRef.current.audioCtx) engineRef.current.audioCtx.suspend(); };
    }, [levelData, isSandbox]);

    const handleSandboxStart = () => { initEngine(sbLhsHtml, sbRhsHtml); setGameState('playing'); };

    return (
        <div className="flex flex-col h-screen p-2 md:p-6" ref={gameContainerRef}>
            <style>{engineCSS}</style>
            
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center mb-2 md:mb-4 bg-white/70 backdrop-blur-md p-2 md:p-4 rounded-full shadow-sm border border-white relative z-20">
                <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 md:px-6 py-1 md:py-2 rounded-full font-bold text-xs md:text-base">
                    <i className="fas fa-arrow-left mr-1 md:mr-2"></i> กลับ
                </button>
                
                <div className="text-sm md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 truncate px-2">
                    {isSandbox ? 'โหมดฝึกฝน' : `Map ${mapId} - Level ${levelId}`}
                </div>
                
                <div className="flex items-center gap-1 md:gap-3">
                    <button onClick={() => setShowTutorial(true)} className="bg-yellow-100 text-yellow-700 px-2 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-base">
                        <i className="fas fa-question-circle"></i><span className="hidden md:inline ml-2">วิธีเล่น</span>
                    </button>
                    <div className="bg-blue-50 text-blue-800 px-2 md:px-4 py-1 md:py-2 rounded-full font-bold text-xs md:text-base border border-blue-200 whitespace-nowrap">
                        ย้าย: <span className="text-sm md:text-xl text-blue-600">{moves}</span> 
                        {!isSandbox && <span className="hidden md:inline ml-1 text-gray-500">/{levelData?.parMoves}</span>}
                    </div>
                    <button onClick={() => { setGameState('playing'); isSandbox ? handleSandboxStart() : initEngine(levelData.lhsHtml, levelData.rhsHtml); }} className="bg-red-500 text-white px-2 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-base">
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>

            {/* Sandbox Input - Flex Row Responsive */}
            {isSandbox && (
                <div className="bg-white/90 backdrop-blur-md p-2 md:p-4 rounded-2xl shadow-sm border-2 border-white mb-2 flex flex-col gap-2 shrink-0">
                    <div className="flex gap-2 items-center w-full">
                        <VisualEditor id="sbLhs" label="ฝั่งซ้าย" value={sbLhsHtml} onChange={setSbLhsHtml} />
                        <div className="text-2xl md:text-4xl font-black text-gray-400 mt-6">=</div>
                        <VisualEditor id="sbRhs" label="ฝั่งขวา" value={sbRhsHtml} onChange={setSbRhsHtml} />
                    </div>
                    <button onClick={handleSandboxStart} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-extrabold py-2 px-6 rounded-full text-sm md:text-lg self-center">
                        <i className="fas fa-play mr-2"></i> เล่นสมการนี้
                    </button>
                </div>
            )}

            {/* Engine Area */}
            <div className="flex-1 flex flex-col relative bg-white/40 backdrop-blur-md rounded-2xl md:rounded-[3rem] p-2 md:p-4 border border-white min-h-[50vh]">
                <div id="engine-playground" className="bg-white rounded-xl md:rounded-[2.5rem] border-4 border-white/80 shadow-inner flex items-center justify-center p-2 md:p-8 relative w-full h-full flex-1 overflow-x-auto">
                    <div className="w-[2px] md:w-1 bg-gray-200/80 h-[80%] rounded-full absolute left-1/2 transform -translate-x-1/2 z-0"></div>
                    <div id="engine-lhs" className="flex-1 h-full flex items-center justify-end pr-2 md:pr-10 gap-1 md:gap-3 z-10 w-1/2 overflow-visible"></div>
                    <div className="bg-red-400 text-white w-8 h-8 md:w-[60px] md:h-[60px] rounded-full flex items-center justify-center text-xl md:text-3xl font-black z-20 border-2 border-white flex-shrink-0">=</div>
                    <div id="engine-rhs" className="flex-1 h-full flex items-center justify-start pl-2 md:pl-10 gap-1 md:gap-3 z-10 w-1/2 overflow-visible"></div>
                </div>

                <div className="absolute bottom-2 md:bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 md:gap-6 bg-white/90 px-4 md:px-8 py-2 md:py-3 rounded-full shadow-lg z-30 whitespace-nowrap">
                    <button onClick={() => engineRef.current.undo()} className="text-gray-600 hover:text-blue-600 text-lg md:text-2xl bg-gray-100 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center"><i className="fas fa-undo"></i></button>
                    <div className="text-gray-500 font-bold border-l-2 pl-2 md:pl-6 text-xs md:text-base border-gray-200">
                        <i className="fas fa-hand-pointer text-blue-400 mr-1"></i>ลากวาง <span className="hidden md:inline">| แตะ 2 ครั้งเพื่อแยกส่วน</span>
                    </div>
                </div>
            </div>

            {gameState === 'won' && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
                    <div className="bg-white p-6 md:p-12 rounded-3xl shadow-2xl border-4 border-yellow-300 text-center">
                        <h2 className="text-4xl md:text-6xl font-black text-green-500 mb-4">ยอดเยี่ยม!</h2>
                        {!isSandbox && (
                            <div className="flex gap-2 justify-center mb-6 md:mb-8">
                                {[1,2,3,4,5].map(star => <i key={star} className={`fas fa-star text-4xl md:text-6xl ${star <= starsEarned ? 'text-yellow-400' : 'text-gray-200'}`}></i>)}
                            </div>
                        )}
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-200 text-gray-800 font-bold py-2 md:py-3 px-4 md:px-8 rounded-full text-sm md:text-xl">กลับเมนู</button>
                            {!isSandbox && levelId < 10 && <button onClick={() => { setView('levelSelect'); setTimeout(()=>setView('play'), 100); }} className="bg-blue-500 text-white font-bold py-2 md:py-3 px-4 md:px-8 rounded-full text-sm md:text-xl">ด่านต่อไป</button>}
                        </div>
                    </div>
                </div>
            )}

            {showTutorial && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setShowTutorial(false)}>
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-blue-600 mb-4"><i className="fas fa-book-open mr-2"></i>วิธีเล่น</h2>
                        <ul className="space-y-4 text-sm md:text-lg text-gray-700">
                            <li className="bg-blue-50 p-3 rounded-xl"><strong>ย้ายข้าง:</strong> แตะค้างที่ตัวเลขแล้วลากข้ามฝั่ง (บวกจะกลายเป็นลบ)</li>
                            <li className="bg-green-50 p-3 rounded-xl"><strong>รวมพจน์:</strong> ลากตัวเลขที่เหมือนกันไปซ้อนกันเพื่อคำนวณ</li>
                            <li className="bg-purple-50 p-3 rounded-xl"><strong>แยกส่วน:</strong> แตะไวๆ 2 ครั้ง (Double Tap) ที่ตัวเลขติดตัวแปร (เช่น 3x) เพื่อแยกตัวเลขออกมา</li>
                        </ul>
                        <button onClick={() => setShowTutorial(false)} className="mt-6 w-full bg-blue-500 text-white font-bold py-3 rounded-full text-lg">เข้าใจแล้ว</button>
                    </div>
                </div>
            )}
        </div>
    );
}
