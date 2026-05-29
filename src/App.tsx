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
                <i className="fas fa-mobile-alt text-8xl mb-6 animate-pulse"></i>
                <h1 className="text-3xl font-bold mb-3 shadow-sm">กรุณาหมุนโทรศัพท์</h1>
                <p className="text-xl opacity-90">ตะแคงจอเป็นแนวนอน เพื่อเข้าสู่ Smart Fast-Math AI</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gradient-to-br from-[#84fab0] to-[#8fd3f4] font-['Kanit'] overflow-hidden relative selection:bg-blue-300">
            {/* Header User */}
            {user && view !== 'play' && view !== 'sandbox' && (
                <div className="absolute top-4 right-4 flex items-center gap-4 bg-white/40 backdrop-blur-md px-6 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 z-50 transition-all hover:bg-white/60">
                    <div className="text-lg font-bold text-gray-800 drop-shadow-sm">
                        <i className="fas fa-star text-yellow-500 mr-2 drop-shadow-md"></i> {userData?.totalStars || 0}
                    </div>
                    <div className="text-md text-gray-800 border-l-2 pl-4 border-gray-400/50 font-medium">
                        <i className="fas fa-user-circle text-blue-600 mr-2"></i> {userData?.displayName}
                    </div>
                    <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 text-md ml-3 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full transition-colors">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            )}

            {/* Router */}
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
// UI COMPONENTS (Glassmorphism & 3D UI)
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
        } catch (err) {
            setError('ข้อมูลไม่ถูกต้อง หรือรหัสผ่านสั้นเกินไป');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center p-4">
            <div className="bg-white/30 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/50 max-w-md w-full text-center relative overflow-hidden">
                <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
                
                <div className="text-7xl mb-6 relative z-10 drop-shadow-xl transform hover:scale-110 transition duration-300">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        <i className="fas fa-brain"></i>
                    </span>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2 relative z-10 drop-shadow-md tracking-tight">Smart Fast-Math AI</h1>
                <h2 className="text-lg text-gray-700 font-medium mb-8 relative z-10 bg-white/50 inline-block px-4 py-1 rounded-full border border-white/60 shadow-sm">โดย ครูจักรวรรดิ ไชยโคตร</h2>
                
                {error && <div className="bg-red-500/90 text-white p-3 rounded-2xl mb-4 text-sm font-bold shadow-lg animate-bounce">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                    <input type="email" placeholder="อีเมลของคุณ" required value={email} onChange={e => setEmail(e.target.value)}
                        className="px-5 py-4 rounded-2xl bg-white/60 border border-white/50 focus:bg-white focus:ring-4 focus:ring-blue-400/50 outline-none text-lg transition-all shadow-inner font-medium text-gray-700 placeholder-gray-500" />
                    <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={e => setPassword(e.target.value)}
                        className="px-5 py-4 rounded-2xl bg-white/60 border border-white/50 focus:bg-white focus:ring-4 focus:ring-blue-400/50 outline-none text-lg transition-all shadow-inner font-medium text-gray-700 placeholder-gray-500" />
                    <button type="submit" className="bg-gradient-to-b from-blue-400 to-blue-600 text-white font-extrabold py-4 rounded-2xl shadow-[0_6px_0_#1e3a8a,0_10px_20px_rgba(0,0,0,0.2)] transform transition-all active:translate-y-[6px] active:shadow-[0_0px_0_#1e3a8a,0_0px_0_rgba(0,0,0,0)] hover:brightness-110 text-xl mt-4">
                        {isLogin ? 'เข้าสู่ระบบเลย!' : 'สมัครสมาชิกใหม่'}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-8 text-gray-700 font-bold hover:text-blue-700 transition-colors relative z-10 bg-white/40 px-6 py-2 rounded-full border border-white/50">
                    {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
                </button>
            </div>
        </div>
    );
}

function MainMenu({ setView, isAdmin }) {
    return (
        <div className="flex h-screen items-center justify-center p-6">
            <div className="bg-white/40 backdrop-blur-xl p-12 rounded-[3rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/60 w-[800px] text-center">
                <h1 className="text-6xl font-extrabold text-gray-800 mb-12 drop-shadow-lg tracking-wide">
                    <i className="fas fa-rocket text-blue-600 mr-4 animate-bounce"></i>เลือกโหมด
                </h1>
                <div className="grid grid-cols-2 gap-8">
                    <MenuButton icon="fa-play" text="ลุยด่าน (Campaign)" color="from-green-400 to-emerald-600" shadowColor="#047857" onClick={() => setView('mapSelect')} />
                    <MenuButton icon="fa-dumbbell" text="ฝึกฝน (Sandbox)" color="from-orange-400 to-red-500" shadowColor="#991b1b" onClick={() => setView('sandbox')} />
                    <MenuButton icon="fa-crown" text="ตารางอันดับ" color="from-yellow-300 to-amber-500" shadowColor="#b45309" onClick={() => setView('leaderboard')} colSpan={isAdmin ? 1 : 2} />
                    {isAdmin && <MenuButton icon="fa-tools" text="ตั้งค่าด่าน (Admin)" color="from-gray-600 to-gray-800" shadowColor="#1f2937" onClick={() => setView('admin')} />}
                </div>
            </div>
        </div>
    );
}

function MenuButton({ icon, text, color, shadowColor, onClick, colSpan = 1 }) {
    return (
        <button onClick={onClick} className={`bg-gradient-to-b ${color} text-white font-extrabold py-8 px-6 rounded-3xl shadow-[0_8px_0_${shadowColor},0_15px_20px_rgba(0,0,0,0.3)] transform transition-all active:translate-y-[8px] active:shadow-[0_0px_0_${shadowColor},0_0px_0_rgba(0,0,0,0)] text-3xl flex flex-col items-center justify-center gap-4 hover:brightness-110 col-span-${colSpan} group border-2 border-white/20`}>
            <i className={`fas ${icon} text-6xl mb-2 group-hover:scale-110 transition-transform drop-shadow-md`}></i> {text}
        </button>
    );
}

function MapSelect({ setView, setSelectedMap, userProgress }) {
    const maps = Array.from({ length: 10 }, (_, i) => i + 1);
    const isMapUnlocked = (mapNum) => {
        if (mapNum === 1) return true;
        const prevMapLastLevelKey = `map${mapNum - 1}_level10`;
        return (userProgress[prevMapLastLevelKey]?.stars || 0) > 0;
    };

    return (
        <div className="p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('menu')} className="bg-white/70 backdrop-blur-md px-6 py-3 rounded-full mb-8 font-bold text-gray-800 hover:bg-white shadow-md border border-white transition-all transform hover:-translate-x-1 text-xl"><i className="fas fa-chevron-left mr-2"></i> กลับเมนู</button>
            <h1 className="text-5xl font-extrabold text-gray-800 mb-12 text-center bg-white/60 backdrop-blur-md py-4 rounded-full max-w-md mx-auto shadow-lg border-2 border-white/80 drop-shadow-sm">เลือกพื้นที่เรียนรู้</h1>
            
            <div className="grid grid-cols-5 gap-8 max-w-6xl mx-auto pb-10">
                {maps.map(mapNum => {
                    const unlocked = isMapUnlocked(mapNum);
                    return (
                        <button key={mapNum} disabled={!unlocked} onClick={() => { setSelectedMap(mapNum); setView('levelSelect'); }}
                            className={`relative flex flex-col items-center justify-center h-40 rounded-[2rem] border-4 transition-all ${unlocked ? 'bg-gradient-to-br from-blue-100 to-white border-blue-400 shadow-[0_6px_0_#60a5fa,0_10px_15px_rgba(0,0,0,0.1)] active:translate-y-[6px] active:shadow-none hover:brightness-105 cursor-pointer' : 'bg-gray-200/50 border-gray-400/30 opacity-70 cursor-not-allowed shadow-inner backdrop-blur-sm'}`}>
                            <span className={`text-4xl font-black ${unlocked ? 'text-blue-600 drop-shadow-sm' : 'text-gray-500'}`}>Map</span>
                            <span className={`text-5xl font-black mt-1 ${unlocked ? 'text-blue-700' : 'text-gray-500'}`}>{mapNum}</span>
                            {!unlocked && <div className="absolute inset-0 bg-gray-500/10 rounded-[1.75rem] flex items-center justify-center"><i className="fas fa-lock text-gray-600/50 text-5xl"></i></div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

function LevelSelect({ setView, mapId, setSelectedLevel, setLevelData, allLevels, userProgress }) {
    const levels = Array.from({ length: 10 }, (_, i) => i + 1);
    const isLevelUnlocked = (lvlNum) => {
        if (lvlNum === 1) return true;
        const prevLevelKey = `map${mapId}_level${lvlNum - 1}`;
        return (userProgress[prevLevelKey]?.stars || 0) > 0;
    };

    return (
        <div className="p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('mapSelect')} className="bg-white/70 backdrop-blur-md px-6 py-3 rounded-full mb-8 font-bold text-gray-800 hover:bg-white shadow-md border border-white transition-all transform hover:-translate-x-1 text-xl"><i className="fas fa-chevron-left mr-2"></i> เลือก Map</button>
            <h1 className="text-5xl font-extrabold text-gray-800 mb-12 text-center bg-white/60 backdrop-blur-md py-4 rounded-full max-w-lg mx-auto shadow-lg border-2 border-white/80 drop-shadow-sm">Map {mapId} - ด่านทดสอบ</h1>
            
            <div className="grid grid-cols-5 gap-6 max-w-5xl mx-auto pb-10">
                {levels.map(lvlNum => {
                    const levelKey = `map${mapId}_level${lvlNum}`;
                    const levelExists = allLevels[levelKey];
                    const unlocked = isLevelUnlocked(lvlNum) && levelExists;
                    const stars = userProgress[levelKey]?.stars || 0;

                    return (
                        <button key={lvlNum} disabled={!unlocked && levelExists} onClick={() => { 
                                if(levelExists) { setSelectedLevel(lvlNum); setLevelData(allLevels[levelKey]); setView('play'); } 
                                else alert("ด่านนี้กำลังอยู่ระหว่างการสร้างครับ");
                            }}
                            className={`relative flex flex-col items-center justify-center h-36 rounded-[1.5rem] border-4 transition-all ${unlocked ? 'bg-gradient-to-br from-green-50 to-white border-green-500 shadow-[0_6px_0_#22c55e,0_10px_15px_rgba(0,0,0,0.1)] active:translate-y-[6px] active:shadow-none hover:scale-105 cursor-pointer' : (!levelExists ? 'bg-red-50/50 border-red-200/50 backdrop-blur-sm' : 'bg-gray-200/50 border-gray-400/30 backdrop-blur-sm opacity-80 cursor-not-allowed')}`}>
                            
                            <span className={`text-5xl font-black ${unlocked ? 'text-green-600 drop-shadow-md' : 'text-gray-400'}`}>{lvlNum}</span>
                            
                            <div className="flex gap-1 mt-3 bg-white/80 px-3 py-1 rounded-full shadow-inner border border-gray-100">
                                {[1,2,3,4,5].map(star => (
                                    <i key={star} className={`fas fa-star text-sm ${star <= stars ? 'text-yellow-400 drop-shadow' : 'text-gray-300'}`}></i>
                                ))}
                            </div>
                            
                            {!unlocked && levelExists && <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-[1.25rem]"><i className="fas fa-lock text-gray-500/60 text-4xl"></i></div>}
                            {!levelExists && <span className="absolute bottom-2 text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full">ยังไม่เปิด</span>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

// ==========================================
// VISUAL EQUATION BUILDER (For Admin & Sandbox)
// ==========================================
// Based precisely on the HTML/CSS from[cite: 2]
function VisualEditor({ id, label, value, onChange }) {
    const editorRef = useRef(null);

    // Initialize HTML content if value exists, but only once to avoid messing up cursor
    useEffect(() => {
        if (editorRef.current && value && editorRef.current.innerHTML === '') {
            editorRef.current.innerHTML = value;
        }
    }, []);

    const handleInput = () => {
        if(editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const insertNodeAtCursor = (node) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        let sel = window.getSelection();
        if (sel.rangeCount > 0) {
            let range = sel.getRangeAt(0);
            
            // Check if cursor is inside our editor
            if (!editorRef.current.contains(range.commonAncestorContainer)) {
                 editorRef.current.appendChild(node);
            } else {
                range.deleteContents();
                range.insertNode(node);
                range.setStartAfter(node);
                range.setEndAfter(node);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } else {
            editorRef.current.appendChild(node);
        }
        handleInput();
    };

    const insertFraction = (e) => {
        e.preventDefault();
        const frac = document.createElement('span');
        frac.className = 'editor-node editor-fraction';
        frac.contentEditable = "false";
        frac.innerHTML = `<span class="frac-num" contenteditable="true"></span><div class="frac-line"></div><span class="frac-den" contenteditable="true"></span>`;
        insertNodeAtCursor(frac);
        const spacer = document.createTextNode('\u00A0'); 
        insertNodeAtCursor(spacer);
        setTimeout(() => frac.querySelector('.frac-num').focus(), 10);
    };

    const insertSymbol = (e, sym) => {
        e.preventDefault();
        if(editorRef.current) {
            editorRef.current.focus();
            document.execCommand('insertText', false, sym);
            handleInput();
        }
    };

    const clearEditor = (e) => {
        e.preventDefault();
        if(editorRef.current) {
            editorRef.current.innerHTML = '';
            handleInput();
        }
    };

    // Styling based exactly on[cite: 2]
    const styles = {
        editorContainer: "bg-white border-4 border-blue-200 rounded-2xl p-4 flex items-center min-h-[90px] font-['Fredoka'] text-3xl color-gray-700 overflow-x-auto whitespace-nowrap cursor-text transition-all focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]",
        toolbarBtn: "bg-white text-gray-700 border-2 border-gray-300 rounded-xl px-4 py-2 font-bold text-lg transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:scale-95 shadow-sm"
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-center gap-2 flex-wrap bg-gray-100 p-2 rounded-2xl border border-gray-200 shadow-inner">
                <button onMouseDown={insertFraction} className={styles.toolbarBtn}><i className="fas fa-columns rotate-90 mr-2 text-blue-500"></i>เศษส่วน</button>
                <button onMouseDown={(e)=>insertSymbol(e,'•')} className={styles.toolbarBtn}><i className="fas fa-circle text-xs mr-2 text-purple-500"></i>คูณ (•)</button>
                <button onMouseDown={(e)=>insertSymbol(e,'x')} className={styles.toolbarBtn + " text-green-600"}>ตัวแปร x</button>
                <button onMouseDown={(e)=>insertSymbol(e,'+')} className={styles.toolbarBtn}>+</button>
                <button onMouseDown={(e)=>insertSymbol(e,'-')} className={styles.toolbarBtn}>-</button>
                <button onMouseDown={clearEditor} className={`${styles.toolbarBtn} !text-red-500 !border-red-200 hover:!bg-red-50`}><i className="fas fa-trash-alt mr-2"></i>ล้าง</button>
            </div>
            
            <div>
                <label className="block text-gray-700 font-extrabold mb-2 text-xl ml-2">{label}</label>
                <div 
                    id={id}
                    ref={editorRef}
                    className={styles.editorContainer}
                    contentEditable="true"
                    onInput={handleInput}
                    onBlur={handleInput}
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
            setLhsHtml(data.lhsHtml || ''); 
            setRhsHtml(data.rhsHtml || ''); 
            setParMoves(data.parMoves);
            // Trigger visual refresh if DOM elements exist
            const lhsEl = document.getElementById('adminLhs');
            const rhsEl = document.getElementById('adminRhs');
            if(lhsEl) lhsEl.innerHTML = data.lhsHtml || '';
            if(rhsEl) rhsEl.innerHTML = data.rhsHtml || '';
        } else {
            setLhsHtml(''); setRhsHtml(''); setParMoves(3);
            const lhsEl = document.getElementById('adminLhs');
            const rhsEl = document.getElementById('adminRhs');
            if(lhsEl) lhsEl.innerHTML = '';
            if(rhsEl) rhsEl.innerHTML = '';
        }
        setMessage('');
    }, [mapId, levelId, allLevels]);

    const handleSave = async () => {
        // We save the HTML structure directly so the engine can parse it exactly like the original[cite: 2]
        if (!lhsHtml || !rhsHtml) { setMessage('กรุณาสร้างสมการให้ครบทั้งสองฝั่ง'); return; }
        const levelKey = `map${mapId}_level${levelId}`;
        const docRef = ref(db, `levels/${levelKey}`);
        await set(docRef, { mapId, levelId, lhsHtml, rhsHtml, parMoves: parseInt(parMoves) });
        setMessage(`บันทึก Map ${mapId} เลเวล ${levelId} เรียบร้อยแล้ว!`);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="p-8 h-screen overflow-y-auto flex justify-center items-center">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border-4 border-white w-full max-w-5xl">
                <div className="flex justify-between items-center mb-8 bg-gray-800 text-white p-4 rounded-3xl shadow-lg">
                    <h1 className="text-3xl font-extrabold ml-4"><i className="fas fa-tools text-yellow-400 mr-3"></i>ตั้งค่าด่าน (Admin)</h1>
                    <button onClick={() => setView('menu')} className="bg-white/20 px-6 py-2 rounded-full font-bold hover:bg-white hover:text-gray-900 transition-colors">กลับเมนู</button>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-8 bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100 shadow-inner">
                    <div>
                        <label className="block text-gray-700 font-bold mb-3 text-lg">เลือกพื้นที่ (Map)</label>
                        <select value={mapId} onChange={e => setMapId(parseInt(e.target.value))} className="w-full p-4 rounded-2xl border-2 border-blue-200 text-xl font-bold bg-white shadow-sm focus:border-blue-500 outline-none">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Map {n}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-3 text-lg">เลือกระดับ (Level)</label>
                        <select value={levelId} onChange={e => setLevelId(parseInt(e.target.value))} className="w-full p-4 rounded-2xl border-2 border-blue-200 text-xl font-bold bg-white shadow-sm focus:border-blue-500 outline-none">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Level {n}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-6 items-center w-full mb-8">
                    <VisualEditor id="adminLhs" label="สมการฝั่งซ้าย (LHS)" value={lhsHtml} onChange={setLhsHtml} />
                    <div className="text-6xl font-black text-gray-400 drop-shadow-sm">=</div>
                    <VisualEditor id="adminRhs" label="สมการฝั่งขวา (RHS)" value={rhsHtml} onChange={setRhsHtml} />
                </div>

                <div className="bg-orange-50 p-6 rounded-3xl border-2 border-orange-100 shadow-inner mb-8 w-1/2 mx-auto">
                    <label className="block text-gray-800 font-bold mb-3 text-center text-xl">จำนวนการย้ายเพื่อ 5 ดาว (Par Moves)</label>
                    <input type="number" value={parMoves} onChange={e => setParMoves(e.target.value)} min="1" className="w-full p-4 rounded-2xl border-2 border-orange-200 text-3xl font-black text-center bg-white shadow-sm focus:border-orange-500 outline-none" />
                </div>

                {message && <div className={`p-4 rounded-2xl mb-6 font-bold text-center text-xl shadow-md ${message.includes('เรียบร้อย') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{message}</div>}

                <button onClick={handleSave} className="w-full bg-gradient-to-b from-green-400 to-green-600 text-white font-extrabold py-6 rounded-3xl text-3xl shadow-[0_8px_0_#166534,0_15px_20px_rgba(0,0,0,0.2)] transform transition-all active:translate-y-[8px] active:shadow-none hover:brightness-110">
                    <i className="fas fa-save mr-3"></i> บันทึกด่านนี้
                </button>
            </div>
        </div>
    );
}

function Leaderboard({ setView, leaderboard }) {
    return (
        <div className="p-8 h-screen flex justify-center items-center">
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-white max-w-3xl w-full h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-amber-400 to-orange-500 p-6 rounded-3xl shadow-lg">
                    <h1 className="text-4xl font-extrabold text-white drop-shadow-md"><i className="fas fa-crown text-yellow-200 mr-4"></i>หอเกียรติยศ (อันดับผู้เล่น)</h1>
                    <button onClick={() => setView('menu')} className="bg-white/20 text-white px-6 py-3 rounded-full font-bold hover:bg-white hover:text-orange-600 transition-colors shadow-sm">กลับเมนู</button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                    {leaderboard.length === 0 ? (
                        <div className="text-center text-gray-500 mt-20 text-2xl font-bold bg-white/50 py-10 rounded-3xl border-2 border-dashed border-gray-300">ยังไม่มีข้อมูลผู้เล่น มาร่วมสร้างสถิติกันเถอะ!</div>
                    ) : (
                        leaderboard.map((u, index) => (
                            <div key={u.id} className={`flex items-center justify-between p-6 rounded-[2rem] border-4 transition-transform hover:scale-[1.02] shadow-sm ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-100 border-yellow-400 shadow-md' : index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-100 border-gray-300' : index === 2 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300' : 'bg-white/80 border-white'}`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl shadow-inner ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-yellow-500/50' : index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {index + 1}
                                    </div>
                                    <div className="text-2xl font-extrabold text-gray-800">{u.displayName}</div>
                                </div>
                                <div className="text-3xl font-black text-gray-800 flex items-center bg-white/50 px-6 py-2 rounded-full shadow-sm">
                                    {u.totalStars} <i className="fas fa-star text-yellow-400 ml-3 drop-shadow"></i>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 3. THE CORE GAME ENGINE WRAPPER (Full Touch + Vanilla Integration)
// ==========================================
// Using the exact engine code from[cite: 2] injected safely.
function GameEngine({ view, setView, levelData, mapId, levelId, saveProgress }) {
    const gameContainerRef = useRef(null);
    const [moves, setMoves] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, won
    const [starsEarned, setStarsEarned] = useState(0);
    const [showTutorial, setShowTutorial] = useState(false);
    
    // Sandbox specific state
    const isSandbox = view === 'sandbox';
    const [sbLhsHtml, setSbLhsHtml] = useState('(x+9)•<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true">5</span><div class="frac-line"></div><span class="frac-den" contenteditable="true">3</span></span>&nbsp;+ 5');
    const [sbRhsHtml, setSbRhsHtml] = useState('20');
    const [engineReady, setEngineReady] = useState(false);

    // Global references for the Vanilla JS engine
    const engineRef = useRef({
        localGameState: { lhs: [], rhs: [] },
        historyStack: [],
        historyIndex: -1,
        internalMoveCount: 0,
        dragSrc: null,
        audioCtx: null,
        initComplete: false
    });

    // We must inject CSS exactly as provided in the source[cite: 2] to ensure the DOM builder renders correctly.
    const engineCSS = `
        .term-container { display: inline-flex; align-items: center; margin: 0 2px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .term-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 16px; background: white; color: #4a5568; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 1.8rem; border-radius: 16px; cursor: grab; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08); border: 2px solid #e2e8f0; position: relative; min-width: 60px; transition: all 0.2s; user-select: none;}
        .term-card.is-variable { background: #4FACFE; color: white; border-color: #00f2fe; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .term-card.is-number { background: linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%); color: white; border-color: #fff; }
        .term-card.is-operator { background: transparent; box-shadow: none; border: none; color: #718096; font-size: 1.5rem; padding: 0 5px; min-width: auto; cursor: default; }
        .term-card.is-operator.interactive { cursor: pointer; }
        .term-card.is-operator.draggable-negative { cursor: grab; color: #e53e3e; font-weight: bold; transition: transform 0.2s; }
        .term-card.is-operator.draggable-negative:hover { transform: scale(1.3); }
        .term-card.is-operator:hover { color: #4a5568; transform: scale(1.2); }
        .term-card:active { cursor: grabbing; transform: scale(0.95); }
        .fraction-group { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 8px; background: rgba(255,255,255,0.5); padding: 8px 12px; border-radius: 16px; border: 2px dashed #cbd5e0; transition: background 0.2s; cursor: grab;}
        .fraction-group:hover { background: rgba(255,255,255,0.8); border-color: #4FACFE; }
        .fraction-line { width: 100%; height: 3px; background-color: #4a5568; margin: 6px 0; border-radius: 2px; }
        .numerator-container, .denominator-container { display: flex; align-items: center; justify-content: center; padding: 2px; min-width: 60px; min-height: 45px; }
        .numerator-term:hover, .denominator-term:hover { transform: scale(1.1); z-index: 10; }
        .group-bracket { color: #94a3b8; font-size: 3.5rem; font-weight: 300; line-height: 0.8; margin: 0 2px; cursor: default; font-family: 'Kanit', sans-serif; transform: translateY(-4px); text-shadow: 1px 1px 0px rgba(0,0,0,0.1); }
        .dragging-ghost { opacity: 0.9; position: fixed; z-index: 9999; pointer-events: none; transform: scale(1.1) rotate(2deg); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15); }
        .editor-fraction { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 5px; background: #f7fafc; border-radius: 8px; padding: 2px 5px; border: 1px dashed #cbd5e0; user-select: none; }
        .frac-num, .frac-den { min-width: 20px; min-height: 24px; text-align: center; outline: none; padding: 0 4px; background: white; border-radius: 4px; border: 1px solid transparent; }
        .frac-line { width: 100%; height: 2px; background: #4a5568; margin: 2px 0; }
    `;

    // -----------------------------------------------------------------
    // THE VANILLA MATH ENGINE[cite: 2] (Adapted for React ref & Touch)
    // -----------------------------------------------------------------
    const initEngine = (lhsHtmlSource, rhsHtmlSource) => {
        const eng = engineRef.current;
        eng.internalMoveCount = 0;
        setMoves(0);
        eng.historyStack = [];
        eng.historyIndex = -1;
        
        if(!eng.audioCtx) eng.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // 1. Parsing function exact as[cite: 2]
        const parseHTMLtoMath = (htmlString) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            let equation = '';
            function traverse(node) {
                if (node.nodeType === Node.TEXT_NODE) equation += node.textContent;
                else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.classList.contains('editor-fraction')) {
                        let num = node.querySelector('.frac-num')?.innerText.trim() || '1';
                        let den = node.querySelector('.frac-den')?.innerText.trim() || '1';
                        equation += `(${num})/(${den})`;
                    } else node.childNodes.forEach(child => traverse(child));
                }
            }
            traverse(tempDiv);
            let str = equation.replace(/\s+/g, '').replace(/x/g, 'x');
            let oldStr; do { oldStr = str; str = str.replace(/\(\(([^()]+)\)\)/g, '($1)'); } while (oldStr !== str);
            
            // Expression parser[cite: 2]
            class Term { constructor(type, value, children = null, denominator = null) { this.id = Math.random().toString(36).substr(2, 9); this.type = type; this.value = value; this.children = children; this.denominator = denominator; } }
            
            function parseExpression(s) {
                let terms = [], buffer = '', depth = 0; s = s.replace(/\*/g, '•');
                for (let i = 0; i < s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && (char === '+' || char === '-')) { if (buffer === '') buffer += char; else { terms.push(...parseTermGroup(buffer)); terms.push(new Term('op', char)); buffer = ''; } } else buffer += char;
                }
                if (buffer) terms.push(...parseTermGroup(buffer));
                return terms;
            }
            function parseTermGroup(s) {
                let parts = [], buffer = '', depth = 0;
                for(let i=0; i<s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && char === '•') { if(buffer) parts.push(parseSingleTerm(buffer)); parts.push(new Term('op', '•')); buffer = ''; } else buffer += char;
                }
                if(buffer) parts.push(parseSingleTerm(buffer));
                return parts;
            }
            function parseSingleTerm(s) {
                if (s.startsWith('(') && s.endsWith(')')) {
                    let d = 0, match = true; for(let i=0; i<s.length-1; i++) { if(s[i] === '(') d++; if(s[i] === ')') d--; if(d === 0) { match = false; break; } }
                    if(match) { let inner = s.slice(1, -1), innerTerms = parseExpression(inner); if (innerTerms.length > 1) return new Term('group', null, innerTerms); else if (innerTerms.length === 1) return innerTerms[0]; }
                }
                let depth = 0, slashIdx = -1; for(let i=0; i<s.length; i++) { if(s[i] === '(') depth++; if(s[i] === ')') depth--; if(depth === 0 && s[i] === '/') { slashIdx = i; break; } }
                if (slashIdx !== -1) {
                    let numPart = s.substring(0, slashIdx); let denPart = s.substring(slashIdx + 1);
                    let denTerms = parseExpression(denPart); let denTerm = denTerms.length === 1 ? denTerms[0] : new Term('group', null, denTerms);
                    return new Term('fraction', null, parseExpression(numPart), denTerm);
                }
                return new Term('term', s);
            }
            return { terms: parseExpression(str), TermObj: Term };
        };

        const { terms: parsedLhs, TermObj } = parseHTMLtoMath(lhsHtmlSource);
        const { terms: parsedRhs } = parseHTMLtoMath(rhsHtmlSource);
        eng.localGameState.lhs = parsedLhs;
        eng.localGameState.rhs = parsedRhs;
        eng.TermClass = TermObj;

        // Mathematical Helpers[cite: 2]
        eng.gcd = (a, b) => b === 0 ? a : eng.gcd(b, a % b);
        eng.lcm = (a, b) => { if (a === 0 || b === 0) return 0; return Math.abs((a * b) / eng.gcd(a, b)); }

        // System helpers[cite: 2]
        eng.playTone = (type) => {
            if (eng.audioCtx.state === 'suspended') eng.audioCtx.resume();
            const oscillator = eng.audioCtx.createOscillator();
            const gainNode = eng.audioCtx.createGain();
            oscillator.connect(gainNode); gainNode.connect(eng.audioCtx.destination);
            if (type === 'success') { oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(500, eng.audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(1000, eng.audioCtx.currentTime + 0.1); gainNode.gain.setValueAtTime(0.3, eng.audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, eng.audioCtx.currentTime + 0.3); oscillator.start(); oscillator.stop(eng.audioCtx.currentTime + 0.3); } 
            else if (type === 'error') { oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(150, eng.audioCtx.currentTime); oscillator.frequency.linearRampToValueAtTime(100, eng.audioCtx.currentTime + 0.2); gainNode.gain.setValueAtTime(0.2, eng.audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.01, eng.audioCtx.currentTime + 0.2); oscillator.start(); oscillator.stop(eng.audioCtx.currentTime + 0.2); } 
            else if (type === 'pop') { oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(400, eng.audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(600, eng.audioCtx.currentTime + 0.05); gainNode.gain.setValueAtTime(0.2, eng.audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, eng.audioCtx.currentTime + 0.1); oscillator.start(); oscillator.stop(eng.audioCtx.currentTime + 0.1); } 
            else if (type === 'win') { const now = eng.audioCtx.currentTime; const notes = [261.63, 329.63, 392.00, 523.25]; notes.forEach((freq, i) => { const osc = eng.audioCtx.createOscillator(); const gn = eng.audioCtx.createGain(); osc.type = 'square'; osc.frequency.value = freq; osc.connect(gn); gn.connect(eng.audioCtx.destination); osc.start(now + i * 0.15); gn.gain.setValueAtTime(0.2, now + i * 0.15); gn.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4); osc.stop(now + i * 0.15 + 0.4); }); }
        };
        eng.showToast = (msg) => { const t = document.getElementById('engine-toast'); if(t){ t.innerHTML = `<i class="fas fa-check-circle mr-2"></i> ${msg}`; t.classList.add('opacity-100','translate-y-0'); t.classList.remove('opacity-0','translate-y-10'); setTimeout(() => {t.classList.remove('opacity-100','translate-y-0'); t.classList.add('opacity-0','translate-y-10');}, 2000); }};
        eng.showPopup = (msg) => { alert(msg); eng.playTone('error'); };
        eng.shakeElement = (el) => { el.classList.add('animate-shake'); setTimeout(()=>el.classList.remove('animate-shake'), 500); }

        // Simplification & Commit Logic[cite: 2]
        eng.commitState = () => {
            for(let k=0; k<2; k++) { eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs); eng.unwrapGroups(eng.localGameState.lhs); eng.unwrapGroups(eng.localGameState.rhs); }
            eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs);
            eng.saveState(); eng.render(); eng.checkWinCondition();
        };
        eng.saveState = () => {
            if (eng.historyIndex < eng.historyStack.length - 1) eng.historyStack = eng.historyStack.slice(0, eng.historyIndex + 1);
            eng.historyStack.push(JSON.parse(JSON.stringify(eng.localGameState))); eng.historyIndex++; 
        };
        eng.undo = () => { if (eng.historyIndex > 0) { eng.historyIndex--; eng.localGameState = JSON.parse(JSON.stringify(eng.historyStack[eng.historyIndex])); eng.render(); eng.playTone('pop'); } };
        
        eng.unwrapGroups = (list) => {
            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') {
                    let isMultiplying = false;
                    if (i > 0 && list[i-1].value === '•') isMultiplying = true;
                    if (i < list.length - 1 && list[i+1].value === '•') isMultiplying = true;
                    eng.unwrapGroups(term.children);
                    if (term.children.length === 1 && term.children[0].type === 'group') { let innerGroup = term.children[0]; term.children = innerGroup.children; i--; continue; }
                    if (term.children.length === 1 && (term.children[0].type === 'term')) { list.splice(i, 1, term.children[0]); i--; continue; }
                    else if (term.children.length === 2 && term.children[0].type === 'op' && term.children[1].type === 'term') {
                        let op = term.children[0], val = term.children[1];
                        if (op.value === '+') list.splice(i, 1, val); else if (op.value === '-') { list.splice(i, 1, op, val); i++; }
                    }
                    let isSafe = !isMultiplying;
                    if (!isSafe && term.children.length === 1) isSafe = true; 
                    if (isSafe) { list.splice(i, 1, ...term.children); i--; }
                } else if (term.type === 'fraction') {
                    if (term.children) eng.unwrapGroups(term.children);
                    if (term.denominator && term.denominator.type === 'group') {
                        eng.unwrapGroups(term.denominator.children);
                        if (term.denominator.children.length === 1 && term.denominator.children[0].type === 'term') term.denominator = term.denominator.children[0];
                    }
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
                if (term.type === 'op' && term.value === '-' && i < list.length - 1) {
                    let nextTerm = list[i+1];
                    if (nextTerm.type === 'term' && nextTerm.value.startsWith('-')) { term.value = '+'; nextTerm.value = nextTerm.value.substring(1); }
                }
                if (term.type === 'op' && i < list.length - 1 && list[i+1].type === 'op') {
                    let nextOp = list[i+1];
                    if (term.value === '-' && nextOp.value === '-') { term.value = '+'; list.splice(i+1, 1); i--; }
                    else if (term.value === '+' && nextOp.value === '-') { term.value = '-'; list.splice(i+1, 1); i--; }
                    else if (term.value === '-' && nextOp.value === '+') { term.value = '-'; list.splice(i+1, 1); i--; }
                    else if (term.value === '+' && nextOp.value === '+') { term.value = '+'; list.splice(i+1, 1); i--; }
                }
                if (term.type === 'term') {
                    if (term.value && term.value.startsWith('+') && term.value.length > 1) term.value = term.value.substring(1);
                    if (term.value && term.value.startsWith('-') && term.value.length > 1) {
                        if (i > 0 && list[i-1].type === 'op') { let op = list[i-1]; if (op.value === '+') { op.value = '-'; term.value = term.value.substring(1); } else if (op.value === '-') { op.value = '+'; term.value = term.value.substring(1); } }
                        else if (i === 1 && list[0].type === 'op' && list[0].value === '-') { list.shift(); term.value = term.value.substring(1); i--; }
                    }
                    if (term.value) { let oneVarMatch = term.value.match(/^(-?)1([a-zA-Z]+)$/); if (oneVarMatch) term.value = oneVarMatch[1] + oneVarMatch[2]; }
                }
                if (term.type === 'term' && term.value === '1') {
                    if (i + 1 < list.length && list[i+1].type === 'op' && list[i+1].value === '•') { list.splice(i, 2); i--; continue; }
                    if (i > 0 && list[i-1].type === 'op' && list[i-1].value === '•') { list.splice(i-1, 2); i-=2; continue; }
                }
                if (term.type === 'fraction') {
                    let denVal = null;
                    if (term.denominator.type === 'term') denVal = term.denominator.value;
                    else if (term.denominator.type === 'group' && term.denominator.children.length === 1 && term.denominator.children[0].type === 'term') denVal = term.denominator.children[0].value;
                    if (denVal === '1') {
                        let content = term.children;
                        let newTerm = (content.length === 1 && content[0].type !== 'op') ? content[0] : new eng.TermClass('group', null, content);
                        list.splice(i, 1, newTerm); i--; continue;
                    }
                }
            }
        };

        // DOM Rendering[cite: 2]
        eng.render = () => {
            const lhsZone = document.getElementById('engine-lhs');
            const rhsZone = document.getElementById('engine-rhs');
            if(lhsZone) { lhsZone.innerHTML = ''; eng.localGameState.lhs.forEach((t, i) => lhsZone.appendChild(eng.createTermElement(t, 'lhs', eng.localGameState.lhs, i, 0))); }
            if(rhsZone) { rhsZone.innerHTML = ''; eng.localGameState.rhs.forEach((t, i) => rhsZone.appendChild(eng.createTermElement(t, 'rhs', eng.localGameState.rhs, i, 0))); }
        };

        eng.createTermElement = (term, side, list, idx, depth) => {
            let wrapper = document.createElement('div'); wrapper.className = 'term-container'; wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            if (term.type === 'op') {
                let card = document.createElement('div'); card.className = 'term-card is-operator'; card.innerText = term.value;
                if (term.value === '•') { card.ondblclick = (e) => { e.stopPropagation(); eng.combineSplitTerm(term, list, idx); }; card.classList.add('interactive'); } 
                else if (term.value === '-') {
                    if (idx < list.length - 1 && (list[idx+1].type === 'group' || list[idx+1].type === 'fraction')) {
                        card.classList.add('draggable-negative');
                        eng.setupDrag(card, term, side, list, idx, 'distribute-negative');
                    }
                }
                wrapper.appendChild(card);
            } else if (term.type === 'group') {
                let br = eng.getBrackets(depth);
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
                fracGroup.append(numCont, line, denCont); fracGroup.ondblclick = (e) => { e.stopPropagation(); eng.splitFraction(term, list, idx); };
                eng.setupDrag(fracGroup, term, side, list, idx, 'whole-fraction'); wrapper.appendChild(fracGroup); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else {
                let card = document.createElement('div'); card.className = eng.getTermClass(term.value); card.innerText = term.value;
                card.ondblclick = (e) => { e.stopPropagation(); eng.splitTerm(term, list, idx); };
                eng.setupDrag(card, term, side, list, idx, 'term'); wrapper.appendChild(card); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            }
            return wrapper;
        };

        eng.createChildTermElement = (child, list, childIdx, parentId, context, side, parentFracTerm, mainList, mainIdx, depth) => {
            let el;
            if (child.type === 'group') {
                el = document.createElement('div'); el.className = 'term-container inline-flex items-center mx-1'; 
                let br = eng.getBrackets(depth), lB = document.createElement('div'); lB.innerText = br[0]; lB.className = 'group-bracket';
                let rB = document.createElement('div'); rB.innerText = br[1]; rB.className = 'group-bracket';
                el.appendChild(lB); 
                child.children.forEach((gc, i) => el.appendChild(eng.createChildTermElement(gc, child.children, i, parentId, context, side, parentFracTerm, mainList, mainIdx, depth + 1))); 
                el.appendChild(rB);
                if(list) eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context);
            } else {
                el = child.type === 'op' ? document.createElement('span') : document.createElement('div');
                if (parentId) el.dataset.parentFracId = parentId; 
                if(child.type === 'op') { 
                    el.className = 'term-card is-operator mx-1'; el.innerText = child.value;
                    if(child.value === '•' && list) { el.ondblclick = (e) => { e.stopPropagation(); eng.combineSplitTerm(child, list, childIdx); eng.commitState(); }; el.style.cursor = 'pointer'; }
                    else if (child.value === '-' && list) {
                        if (childIdx < list.length - 1 && list[childIdx+1].type === 'group') { el.classList.add('draggable-negative'); eng.setupDrag(el, child, side, list, childIdx, 'distribute-negative', parentFracTerm, mainList, mainIdx, context); }
                    }
                } else {
                    el.className = eng.getTermClass(child.value) + ' px-2 py-1 min-w-[30px] ' + context + '-term'; el.innerText = child.value; el.dataset.parentFracId = parentId; 
                    if(list) el.dataset.childIdx = childIdx;
                    if (context === 'denominator' && !list) { el.dataset.childIdx = 0; eng.setupDrag(el, parentFracTerm, null, mainList, mainIdx, 'denominator', null, null, null, context); } 
                    else if(list) { el.ondblclick = (e) => { e.stopPropagation(); eng.splitTerm(child, list, childIdx); }; eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context); }
                }
            }
            if (el && list) el.dataset.side = side;
            return el;
        };

        eng.getBrackets = (depth) => (depth % 3 === 0) ? ['(', ')'] : (depth % 3 === 1) ? ['[', ']'] : ['{', '}'];
        eng.getTermClass = (val) => val.match(/[a-zA-Z]/) ? 'term-card is-variable' : (['•','+','-'].includes(val)) ? 'term-card is-operator' : 'term-card is-number';

        // DRAG & DROP WITH FULL MOBILE TOUCH SUPPORT
        eng.setupDrag = (el, term, side, list, idx, role, parentFracTerm = null, mainList = null, mainIdx = null, sourceContext = null) => {
            const handleStart = (clientX, clientY, eOriginal) => {
                eOriginal.stopPropagation(); eOriginal.preventDefault();
                eng.internalMoveCount++; setMoves(eng.internalMoveCount); // Track moves for stars
                eng.dragSrc = { el, term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext };
                let ghost = el.cloneNode(true); ghost.classList.add('dragging-ghost'); ghost.style.width = el.offsetWidth + 'px'; 
                document.body.appendChild(ghost); eng.dragSrc.ghost = ghost;
                
                const moveGhost = (x, y) => { eng.dragSrc.ghost.style.left = (x - eng.dragSrc.ghost.offsetWidth/2) + 'px'; eng.dragSrc.ghost.style.top = (y - eng.dragSrc.ghost.offsetHeight/2) + 'px'; };
                moveGhost(clientX, clientY);
                
                const onMove = (ev) => {
                    let cx = ev.clientX ?? ev.touches?.[0]?.clientX;
                    let cy = ev.clientY ?? ev.touches?.[0]?.clientY;
                    if(cx && cy) moveGhost(cx, cy);
                };

                const onEnd = (ev) => {
                    document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                    if (!eng.dragSrc) return;
                    
                    let endX = ev.clientX; let endY = ev.clientY;
                    if(ev.changedTouches && ev.changedTouches.length > 0) { endX = ev.changedTouches[0].clientX; endY = ev.changedTouches[0].clientY; }
                    
                    let pg = document.getElementById('engine-playground');
                    if(pg) {
                        let rect = pg.getBoundingClientRect(), midX = rect.left + rect.width/2;
                        let isGlobalMove = (role === 'term' || role === 'denominator' || role === 'whole-fraction');
                        let currentSide = eng.dragSrc.side || (eng.dragSrc.list === eng.localGameState.lhs ? 'lhs' : (eng.dragSrc.list === eng.localGameState.rhs ? 'rhs' : null));
                        let crossRight = currentSide === 'lhs' && endX > midX + 50, crossLeft = currentSide === 'rhs' && endX < midX - 50;
                        
                        if (isGlobalMove && (crossRight || crossLeft)) {
                            eng.dragSrc.side = currentSide; eng.executeMoveSide();
                        } else {
                            eng.dragSrc.ghost.style.display = 'none'; 
                            let elemBelow = document.elementFromPoint(endX, endY); 
                            eng.dragSrc.ghost.style.display = 'block';
                            
                            // Simplified combination logic bridging to[cite: 2] complex logic
                            if (role === 'distribute-negative') {
                                let cItem = eng.dragSrc.el.closest('.term-container');
                                let nItem = cItem ? cItem.nextElementSibling : null;
                                if (nItem && (nItem === elemBelow || nItem.contains(elemBelow))) { eng.distributeNegative(eng.dragSrc.term, eng.dragSrc.list, eng.dragSrc.idx); }
                            } else {
                                let targetWrapper = elemBelow ? elemBelow.closest('.term-container') : null;
                                if (targetWrapper && targetWrapper !== eng.dragSrc.el.closest('.term-container')) {
                                    eng.tryCombine(targetWrapper, elemBelow); 
                                }
                            }
                        }
                    }
                    if (eng.dragSrc && eng.dragSrc.ghost) eng.dragSrc.ghost.remove(); eng.dragSrc = null;
                };

                document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, {passive: false});
                document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
            };

            el.onmousedown = (e) => { if(e.button === 0) handleStart(e.clientX, e.clientY, e); };
            el.ontouchstart = (e) => { if(e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY, e); };
        };

        // Actions[cite: 2]
        eng.executeMoveSide = () => {
            let { term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext } = eng.dragSrc;
            if (role === 'inner-term' && parentFracTerm && list.length === 1) { term = parentFracTerm; list = mainList; idx = mainIdx; role = 'denominator'; eng.showToast("ย้ายทั้งตัวส่วน"); }
            if (!list) return; let targetList = side === 'lhs' ? eng.localGameState.rhs : eng.localGameState.lhs;
            
            if (role === 'denominator') {
                if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) { eng.showPopup("รวมเศษส่วนก่อนย้ายตัวหารครับ"); eng.shakeElement(eng.dragSrc.el); return; }
                let numGroup = new eng.TermClass('group', null, JSON.parse(JSON.stringify(term.children)));
                list.splice(idx, 1, numGroup);
                if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                let val = term.denominator.value || "1";
                if(term.denominator.type === 'group' && term.denominator.children.length === 1) targetList.push(new eng.TermClass('op', '•'), term.denominator.children[0]);
                else if (term.denominator.type === 'group') targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('group', null, term.denominator.children));
                else targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', val));
                eng.playTone('success');
            } else {
                let isFactor = false, removeIdx = idx, removeCount = 1, nextTerm = (idx < list.length - 1) ? list[idx+1] : null, prevTerm = (idx > 0) ? list[idx-1] : null;
                if (nextTerm && nextTerm.value === '•') { isFactor = true; removeCount = 2; } else if (prevTerm && prevTerm.value === '•') { isFactor = true; removeIdx = idx - 1; removeCount = 2; }
                if (isFactor || sourceContext === 'denominator') {
                    if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) { eng.showPopup("กำจัดบวกลบก่อนย้ายตัวคูณครับ"); eng.shakeElement(eng.dragSrc.el); return; }
                    let moveValue = term.value;
                    if(idx === 1 && list[0].type === 'op' && (list[0].value === '-' || list[0].value === '+')) { if(list[0].value === '-') moveValue = '-' + moveValue; removeIdx = 0; removeCount += 1; }
                    list.splice(removeIdx, removeCount);
                    if (sourceContext === 'denominator') {
                        if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                        targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', moveValue)); eng.showToast(`ย้ายขึ้นมาคูณ`); eng.playTone('success');
                    } else {
                        let num = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('fraction', null, num, new eng.TermClass('term', moveValue))); eng.playTone('success');
                    }
                } else {
                    let movingSign = '+'; if (idx > 0 && list[idx-1].type === 'op') { movingSign = list[idx-1].value; removeIdx = idx - 1; removeCount = 2; }
                    list.splice(removeIdx, removeCount); if(list.length > 0 && list[0].type === 'op' && (list[0].value === '+' || list[0].value === '•')) list.shift();
                    let newSign = movingSign === '+' ? '-' : '+';
                    if (targetList.length > 0) targetList.push(new eng.TermClass('op', newSign)); else if (newSign === '-') targetList.push(new eng.TermClass('op', '-'));
                    targetList.push(term); eng.playTone('success');
                }
            }
            eng.commitState();
        };

        eng.tryCombine = (targetWrapper, elemBelow) => {
            let list = eng.dragSrc.list, targetIdx = parseInt(targetWrapper.dataset.idx);
            if (isNaN(targetIdx) || targetIdx === eng.dragSrc.idx) return;
            let srcTerm = eng.dragSrc.term, targetTerm = list[targetIdx];
            let min = Math.min(eng.dragSrc.idx, targetIdx), max = Math.max(eng.dragSrc.idx, targetIdx);
            
            if (max - min === 2) {
                let op = list[min+1];
                if (op && (op.value === '+' || op.value === '-')) {
                    if ((min > 0 && list[min-1].value === '•') || (max < list.length-1 && list[max+1].value === '•')) { eng.showPopup("ติดตัวคูณอยู่ครับ"); eng.shakeElement(eng.dragSrc.el); return; }
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
        eng.splitTerm = (term, list, idx) => { let m = term.value.match(/^(-?\d+)([a-zA-Z]+)$/); if(m) { list.splice(idx, 1, new eng.TermClass('term', m[1]), new eng.TermClass('op', '•'), new eng.TermClass('term', m[2])); eng.commitState(); eng.playTone('pop'); }};
        eng.combineSplitTerm = (term, list, idx) => { if(idx>0 && idx<list.length-1) { list.splice(idx-1, 3, new eng.TermClass('term', list[idx-1].value + list[idx+1].value)); eng.commitState(); eng.playTone('success'); } };
        eng.distributeNegative = (term, list, idx) => { if(idx >= list.length-1) return; let t = list[idx+1]; if(t.type==='group') { list[idx].value='+'; list.splice(idx+1, 1, ...t.children); eng.commitState(); eng.playTone('pop'); } };

        eng.checkWinCondition = () => {
            const isSolved = (list) => list.length === 1 && list[0].type === 'term' && (list[0].value === 'x' || list[0].value === '1x');
            const isNum = (list) => list.length === 1 && list[0].type === 'term' && !isNaN(list[0].value);
            if ((isSolved(eng.localGameState.lhs) && isNum(eng.localGameState.rhs)) || (isSolved(eng.localGameState.rhs) && isNum(eng.localGameState.lhs))) {
                eng.playTone('win');
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#4ade80', '#3b82f6', '#fbbf24'] });
                setGameState('won');
                if (!isSandbox) {
                    let calcStars = (eng.internalMoveCount <= levelData?.parMoves) ? 5 : (eng.internalMoveCount === levelData?.parMoves+1 ? 4 : (eng.internalMoveCount === levelData?.parMoves+2 ? 3 : (eng.internalMoveCount === levelData?.parMoves+3 ? 2 : 1)));
                    setStarsEarned(calcStars);
                    saveProgress(mapId, levelId, calcStars);
                }
            }
        };

        eng.commitState();
        eng.initComplete = true;
    };

    // Initialize Game Engine when component mounts or level changes
    useEffect(() => {
        if (!isSandbox && levelData) {
            initEngine(levelData.lhsHtml || levelData.lhs, levelData.rhsHtml || levelData.rhs);
            setEngineReady(true);
        } else if (isSandbox) {
            initEngine(sbLhsHtml, sbRhsHtml);
            setEngineReady(true);
        }
        return () => { if(engineRef.current.audioCtx) engineRef.current.audioCtx.suspend(); };
    }, [levelData, isSandbox]);

    const handleSandboxStart = () => {
        initEngine(sbLhsHtml, sbRhsHtml);
        setEngineReady(true);
    };

    return (
        <div className="flex flex-col h-screen p-4 sm:p-6" ref={gameContainerRef}>
            <style>{engineCSS}</style>
            
            {/* Top Header */}
            <div className="flex justify-between items-center mb-6 bg-white/70 backdrop-blur-md p-4 rounded-[2rem] shadow-lg border border-white relative z-20">
                <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-bold transition-all shadow-sm border border-gray-200">
                    <i className="fas fa-arrow-left mr-2"></i> กลับ
                </button>
                
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-sm">
                    {isSandbox ? 'โหมดฝึกฝนสร้างโจทย์ (Sandbox)' : `Map ${mapId} - Level ${levelId}`}
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowTutorial(true)} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-3 rounded-full font-bold shadow-sm transition-colors" title="วิธีเล่น">
                        <i className="fas fa-question-circle text-xl"></i>
                    </button>
                    <div className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-6 py-3 rounded-full font-bold shadow-inner border border-blue-200">
                        ย้าย: <span className="text-3xl text-blue-600">{moves}</span> ครั้ง
                        {!isSandbox && <span className="text-sm ml-2 text-gray-500 block sm:inline-block leading-tight"> (เป้าหมาย: {levelData?.parMoves})</span>}
                    </div>
                    <button onClick={() => isSandbox ? handleSandboxStart() : initEngine(levelData.lhsHtml, levelData.rhsHtml)} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg active:scale-95">
                        <i className="fas fa-sync-alt"></i> เริ่มใหม่
                    </button>
                </div>
            </div>

            {/* Sandbox Input Area */}
            {isSandbox && (
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border-2 border-white mb-6 flex flex-col gap-4">
                    <h3 className="font-bold text-gray-700 text-xl"><i className="fas fa-edit text-blue-500 mr-2"></i>สร้างโจทย์ของคุณเอง:</h3>
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <VisualEditor id="sbLhs" label="สมการฝั่งซ้าย" value={sbLhsHtml} onChange={setSbLhsHtml} />
                        <div className="text-5xl font-black text-gray-400">=</div>
                        <VisualEditor id="sbRhs" label="สมการฝั่งขวา" value={sbRhsHtml} onChange={setSbRhsHtml} />
                    </div>
                    <button onClick={handleSandboxStart} className="mt-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-extrabold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-transform hover:-translate-y-1 self-center text-xl">
                        <i className="fas fa-play mr-2"></i> อัปเดตโจทย์และเริ่มเล่น
                    </button>
                </div>
            )}

            {/* Playground Area */}
            <div className="flex-1 flex flex-col relative justify-center bg-white/40 backdrop-blur-md rounded-[3rem] p-4 shadow-[inset_0_0_50px_rgba(255,255,255,0.8)] border border-white">
                <div id="engine-playground" className="bg-white rounded-[2.5rem] border-[6px] border-white/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.05),0_15px_30px_rgba(0,0,0,0.1)] flex items-center justify-center p-8 relative min-h-[300px] w-full max-w-6xl mx-auto flex-1">
                    <div className="w-1 bg-gray-200/80 h-3/4 rounded-full absolute left-1/2 transform -translate-x-1/2 z-0"></div>
                    <div id="engine-lhs" className="flex-1 h-full flex items-center justify-end pr-10 gap-3 z-10 w-1/2 flex-wrap-reverse overflow-visible"></div>
                    <div className="bg-gradient-to-br from-red-400 to-pink-500 text-white w-[70px] h-[70px] rounded-full flex items-center justify-center text-4xl font-black shadow-[0_5px_15px_rgba(244,63,94,0.4)] z-20 border-4 border-white flex-shrink-0">=</div>
                    <div id="engine-rhs" className="flex-1 h-full flex items-center justify-start pl-10 gap-3 z-10 w-1/2 flex-wrap overflow-visible"></div>
                </div>

                {/* Control Panel (Undo/Redo) */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-white/90 px-8 py-3 rounded-full shadow-xl border border-gray-200 z-30">
                    <button onClick={() => engineRef.current.undo()} className="text-gray-600 hover:text-blue-600 text-2xl transition-colors active:scale-90 bg-gray-100 hover:bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center"><i className="fas fa-undo"></i></button>
                    <div className="text-gray-500 font-bold border-x-2 px-6 border-gray-200 flex items-center gap-2">
                        <i className="fas fa-hand-pointer text-blue-400"></i> ลาก-วางเพื่อแก้สมการ
                    </div>
                </div>
            </div>

            {/* Win Overlay */}
            {gameState === 'won' && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-white p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-4 border-yellow-300 text-center transform hover:scale-105 transition-transform">
                        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-6 drop-shadow-sm">ยอดเยี่ยมมาก!</h2>
                        {!isSandbox && (
                            <div className="flex gap-3 justify-center mb-10">
                                {[1,2,3,4,5].map(star => (
                                    <i key={star} className={`fas fa-star text-7xl ${star <= starsEarned ? 'text-yellow-400 drop-shadow-[0_5px_15px_rgba(250,204,21,0.5)] animate-bounce' : 'text-gray-200'}`} style={{animationDelay: `${star*100}ms`}}></i>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-6 justify-center">
                            <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-4 px-10 rounded-full text-2xl shadow-md border-2 border-gray-300">ออกไปหน้าเมนู</button>
                            {!isSandbox && levelId < 10 && (
                                <button onClick={() => { setView('levelSelect'); setTimeout(()=>setView('play'), 100); }} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 px-10 rounded-full text-2xl shadow-[0_8px_20px_rgba(59,130,246,0.4)]">ด่านต่อไป <i className="fas fa-arrow-right ml-2"></i></button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tutorial Overlay */}
            {showTutorial && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setShowTutorial(false)}>
                    <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-3xl"><i className="fas fa-times-circle"></i></button>
                        <h2 className="text-4xl font-extrabold text-blue-600 mb-6 text-center"><i className="fas fa-book-open mr-3"></i>คู่มือการเล่นสมาร์ทลากวาง</h2>
                        <ul className="space-y-6 text-xl font-medium text-gray-700">
                            <li className="flex items-start gap-4 bg-blue-50 p-4 rounded-2xl"><i className="fas fa-hand-pointer text-blue-500 text-3xl mt-1"></i> <div><strong>ย้ายข้างสมการ:</strong> ใช้นิ้วแตะค้างที่ตัวเลข แล้วลากข้ามเครื่องหมาย = ไปอีกฝั่ง เครื่องหมายจะเปลี่ยน (บวกเป็นลบ, คูณเป็นหาร) อัตโนมัติ</div></li>
                            <li className="flex items-start gap-4 bg-green-50 p-4 rounded-2xl"><i className="fas fa-compress-arrows-alt text-green-500 text-3xl mt-1"></i> <div><strong>รวมพจน์:</strong> ลากตัวเลขหรือตัวแปรที่เหมือนกัน (เช่น 2x กับ 3x หรือตัวเลขธรรมดา) ไปซ้อนทับกันเพื่อรวมค่า</div></li>
                            <li className="flex items-start gap-4 bg-purple-50 p-4 rounded-2xl"><i className="fas fa-mouse-pointer text-purple-500 text-3xl mt-1"></i> <div><strong>แยกพจน์ / แยกเศษส่วน:</strong> ดับเบิ้ลคลิก (หรือแตะ 2 ครั้งติดกัน) ที่ตัวเลขติดตัวแปร หรือ แตะที่กรอบเศษส่วน เพื่อแยกร่างมันออกจากกัน</div></li>
                        </ul>
                        <button onClick={() => setShowTutorial(false)} className="mt-8 w-full bg-blue-500 text-white font-extrabold py-4 rounded-full text-2xl shadow-lg active:scale-95 transition-transform">เข้าใจแล้ว เริ่มเลย!</button>
                    </div>
                </div>
            )}

            <div id="engine-toast" className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800/90 backdrop-blur text-white px-8 py-4 rounded-full font-bold text-xl opacity-0 translate-y-10 transition-all duration-300 z-[2000] shadow-2xl"></div>
        </div>
    );
}
