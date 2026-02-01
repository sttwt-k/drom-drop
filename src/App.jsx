import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  setDoc
} from 'firebase/firestore';
import { 
  Plus, Search, Camera, Clock, CheckCircle, Box, User, X, 
  History, Home, Settings, PenTool, Eraser, Save, 
  ChevronRight, ArrowLeft, Database, Package as PackageIcon, 
  ChevronDown, Building, Edit, AlertTriangle, CheckSquare, Square
} from 'lucide-react';

// ==========================================
// 1. CONFIG & UTILS
// ==========================================

const MY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFah-LOjrjtqm3JqVZAQ88S9KTlVtprb8",
  authDomain: "dormdrop-c016b.firebaseapp.com",
  projectId: "dormdrop-c016b",
  storageBucket: "dormdrop-c016b.firebasestorage.app",
  messagingSenderId: "423788710268",
  appId: "1:423788710268:web:865810081da14be753bcf9"
};

const COLOR_PALETTE = [
  { name: 'Red', class: 'bg-red-500', text: 'text-red-600', bgSoft: 'bg-red-100' },
  { name: 'Orange', class: 'bg-orange-500', text: 'text-orange-600', bgSoft: 'bg-orange-100' },
  { name: 'Amber', class: 'bg-amber-400', text: 'text-amber-600', bgSoft: 'bg-amber-100' },
  { name: 'Green', class: 'bg-green-500', text: 'text-green-600', bgSoft: 'bg-green-100' },
  { name: 'Blue', class: 'bg-blue-500', text: 'text-blue-600', bgSoft: 'bg-blue-100' },
  { name: 'Indigo', class: 'bg-indigo-500', text: 'text-indigo-600', bgSoft: 'bg-indigo-100' },
  { name: 'Purple', class: 'bg-purple-500', text: 'text-purple-600', bgSoft: 'bg-purple-100' },
  { name: 'Pink', class: 'bg-pink-500', text: 'text-pink-600', bgSoft: 'bg-pink-100' },
  { name: 'Slate', class: 'bg-slate-500', text: 'text-slate-600', bgSoft: 'bg-slate-100' },
];

let app, auth, db;
let appId = 'dorm-main'; 
let initError = null;

try {
  let config = MY_FIREBASE_CONFIG;
  // Fallback for canvas environment
  if (!config && typeof __firebase_config !== 'undefined') {
    config = JSON.parse(__firebase_config);
    if (typeof __app_id !== 'undefined') appId = __app_id;
  }
  
  if (config) {
    app = !getApps().length ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    initError = "Configuration Missing";
  }
} catch (e) {
  initError = e.message;
  console.error("Firebase Init Error:", e);
}

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center bg-red-50 text-red-800">
          <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด (App Crashed)</h2>
          <pre className="bg-white p-4 rounded border border-red-200 text-xs text-left w-full overflow-auto max-h-40">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            รีโหลดหน้าจอ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const SignaturePad = ({ onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
    }
  }, []);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb'; 
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (onSave && canvasRef.current) onSave(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      if (onSave) onSave(null);
    }
  };

  return (
    <div className="relative w-full h-48 bg-white border-2 border-dashed border-indigo-200 rounded-2xl overflow-hidden touch-none shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button type="button" onClick={clearCanvas} className="absolute top-3 right-3 p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
        <Eraser className="w-5 h-5" />
      </button>
      <div className="absolute bottom-3 left-3 text-xs text-indigo-300 pointer-events-none font-medium bg-white/80 px-2 py-1 rounded">
        เซ็นชื่อในกรอบนี้
      </div>
    </div>
  );
};

const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const CarrierBadge = ({ carrier }) => {
    const colors = {
      'Kerry': 'bg-orange-500 text-white',
      'Flash': 'bg-yellow-400 text-yellow-900',
      'Thai Post': 'bg-red-500 text-white',
      'J&T': 'bg-red-600 text-white',
      'Lazada': 'bg-blue-600 text-white',
      'Shopee': 'bg-orange-600 text-white',
      'อื่นๆ': 'bg-gray-500 text-white',
    };
    const carrierName = typeof carrier === 'string' ? carrier : 'อื่นๆ';
    return (
      <span className={`text-[10px] px-2 py-1 rounded-md font-bold shadow-sm tracking-wide ${colors[carrierName] || colors['อื่นๆ']}`}>
        {carrierName.toUpperCase()}
      </span>
    );
};

const BuildingBadge = ({ buildingName, config }) => {
    const buildConf = config?.buildings?.find(b => b.name === buildingName);
    const colorClass = buildConf ? COLOR_PALETTE.find(c => c.name === buildConf.color)?.class : 'bg-slate-500';
    return (
        <span className={`${colorClass || 'bg-slate-500'} text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-bold`}>
            {buildingName || 'ไม่ระบุ'}
        </span>
    );
};

// ==========================================
// 2. MAIN APP
// ==========================================

function DormDropApp() {
  const [user, setUser] = useState(null);
  const [packages, setPackages] = useState([]);
  
  // Views
  const [view, setView] = useState('list'); 
  const [isStudentMode, setIsStudentMode] = useState(false);

  const [selectedRoomGroup, setSelectedRoomGroup] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  const [selectedPackages, setSelectedPackages] = useState([]); 
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [historyDetailPackage, setHistoryDetailPackage] = useState(null);

  // Config & Settings
  const [config, setConfig] = useState({
    carriers: ['Kerry', 'Flash', 'Thai Post', 'J&T', 'Lazada', 'Shopee', 'อื่นๆ'],
    types: ['กล่อง', 'ซอง', 'ถุง', 'อาหาร/น้ำ', 'ใหญ่พิเศษ'],
    buildings: [] 
  });
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingColor, setNewBuildingColor] = useState('Blue');

  // Search States
  const [searchBuilding, setSearchBuilding] = useState('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Student Search
  const [studentSearchData, setStudentSearchData] = useState({ building: '', room: '' });

  // Form State (Add/Edit)
  const [formData, setFormData] = useState({
    id: null, // For edit
    building: '',
    room: '',
    tracking: '',
    carrier: '', 
    type: '', 
    sender: '',
    image: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Receive Form
  const [receiverName, setReceiverName] = useState('');
  const [signatureImage, setSignatureImage] = useState(null);

  // --- Initial Load ---
  useEffect(() => {
    // Safe check for window
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'student') {
            setIsStudentMode(true);
            setView('studentSearch');
        }
    }

    if (!auth) return; 
    const initAuth = async () => {
        try { await signInAnonymously(auth); } 
        catch (error) { setDbError("Login failed: " + error.message); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- Fetch Data ---
  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    setDbError(null);
    try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'packages'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              pickedUpAt: data.pickedUpAt?.toDate ? data.pickedUpAt.toDate() : null
            };
          });
          items.sort((a, b) => b.createdAt - a.createdAt);
          setPackages(items);
          setLoading(false);
        }, (error) => {
            setLoading(false);
            if (error.code === 'permission-denied') setDbError("สิทธิ์ไม่ถูกต้อง (Permission Denied)");
            else setDbError("โหลดข้อมูลไม่สำเร็จ: " + error.message);
        });
        return () => unsubscribe();
    } catch (e) {
        setLoading(false);
        setDbError("Init Fetch Error: " + e.message);
    }
  }, [user]);

  // --- Fetch Config ---
  useEffect(() => {
    if (!user || !db) return;
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const loadedConfig = {
          carriers: data.carriers || config.carriers,
          types: data.types || config.types,
          buildings: data.buildings || [] 
        };
        setConfig(loadedConfig);
        
        // Init form defaults
        if (!formData.carrier && loadedConfig.carriers.length > 0) setFormData(p => ({...p, carrier: loadedConfig.carriers[0]}));
        if (!formData.type && loadedConfig.types.length > 0) setFormData(p => ({...p, type: loadedConfig.types[0]}));
        if (!formData.building && loadedConfig.buildings.length > 0) setFormData(p => ({...p, building: loadedConfig.buildings[0].name}));
        if (!studentSearchData.building && loadedConfig.buildings.length > 0) setStudentSearchData(p => ({...p, building: loadedConfig.buildings[0].name}));

      } else {
        setDoc(configDocRef, config).catch(err => console.error(err));
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setFormData(prev => ({ ...prev, image: resized }));
      } catch (err) { alert("Error uploading image"); }
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!formData.room || !formData.tracking) return;
    setIsSubmitting(true);
    try {
      const packageData = {
        building: formData.building || '',
        room: formData.room,
        tracking: formData.tracking,
        carrier: formData.carrier,
        type: formData.type,
        sender: formData.sender || '',
        image: formData.image,
        status: formData.status || 'pending',
      };

      if (formData.id) {
        // Edit mode
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'packages', formData.id);
        await updateDoc(docRef, packageData);
      } else {
        // Add mode
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'packages'), {
          ...packageData,
          createdAt: serverTimestamp(),
          receiver: '',
          signature: null,
          pickedUpAt: null
        });
      }

      setFormData(prev => ({ ...prev, id: null, room: '', tracking: '', sender: '', image: null })); 
      setView('list');
      setSelectedRoomGroup(null);
    } catch (err) { alert("Failed: " + err.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleEditClick = (pkg) => {
      setFormData({
          id: pkg.id,
          building: pkg.building || '',
          room: pkg.room,
          tracking: pkg.tracking,
          carrier: pkg.carrier,
          type: pkg.type,
          sender: pkg.sender || '',
          image: pkg.image,
          status: pkg.status
      });
      setView('add'); 
  };

  const handleReceivePackages = async () => {
    // Determine targets correctly
    let targets = [];
    if (isStudentMode) {
        // In student mode, use the selected items array
        targets = selectedPackages;
    } else {
        // In admin mode, prefer multiple selected packages, fallback to single selectedPackage
        if (selectedPackages.length > 0) {
            targets = selectedPackages;
        } else if (selectedPackage && selectedPackage.id) {
            targets = [selectedPackage];
        }
    }

    // Safety filter
    targets = targets.filter(p => p && p.id);

    if (targets.length === 0) {
        alert("ไม่พบรายการพัสดุที่เลือก");
        return;
    }

    if (!receiverName && !signatureImage) {
        alert("กรุณาลงชื่อหรือเซ็นรับของ");
        return;
    }

    try {
        const batchUpdates = targets.map(pkg => {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'packages', pkg.id);
            return updateDoc(docRef, {
                status: 'picked_up',
                receiver: receiverName,
                signature: signatureImage,
                pickedUpAt: serverTimestamp()
            });
        });
        await Promise.all(batchUpdates);
        
        setSelectedPackages([]);
        setSelectedPackage(null);
        setReceiverName('');
        setSignatureImage(null);
        
        if (isStudentMode) {
            alert("รับพัสดุเรียบร้อยครับ");
        }
    } catch (err) { alert("Update failed: " + err.message); }
  };

  // Config Handlers
  const handleAddStringConfig = async (key, value) => {
    if (!value.trim()) return;
    const newConfig = { ...config, [key]: [...(config[key]||[]), value] };
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig); } catch (e) {}
  };
  const handleDeleteStringConfig = async (key, value) => {
    const newConfig = { ...config, [key]: (config[key]||[]).filter(item => item !== value) };
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig); } catch (e) {}
  };
  const handleAddBuilding = async () => {
      if (!newBuildingName.trim()) return;
      const newBuilding = { name: newBuildingName, color: newBuildingColor };
      const newConfig = { ...config, buildings: [...config.buildings, newBuilding] };
      try { 
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig);
          setNewBuildingName('');
      } catch (e) {}
  };
  const handleDeleteBuilding = async (buildingName) => {
      const newConfig = { ...config, buildings: config.buildings.filter(b => b.name !== buildingName) };
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig); } catch (e) {}
  };

  // --- Filtering & Grouping Logic ---

  const isWithinLastMonth = (date) => {
    if (!date) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return date > oneMonthAgo;
  };

  const allPendingPackages = packages.filter(p => p.status === 'pending');
  const historyPackages = packages.filter(p => 
    p.status === 'picked_up' && 
    isWithinLastMonth(p.createdAt) &&
    (String(p.room).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.tracking).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Grouping for Admin List
  const getGroupedPackages = () => {
    const grouped = {};
    const lowerSearchTerm = searchTerm.toLowerCase();

    allPendingPackages.forEach(pkg => {
      if (searchBuilding !== 'ทั้งหมด' && pkg.building !== searchBuilding) return;
      
      // Case-insensitive search
      if (searchTerm) {
        if (!String(pkg.room).toLowerCase().includes(lowerSearchTerm) && 
            !String(pkg.tracking).toLowerCase().includes(lowerSearchTerm)) return;
      }
      const key = `${pkg.building || ''}|${pkg.room}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(pkg);
    });
    return grouped;
  };

  const groupedPackages = getGroupedPackages();
  const sortedGroupKeys = Object.keys(groupedPackages).sort((a, b) => {
      const [bA, rA] = a.split('|');
      const [bB, rB] = b.split('|');
      if (bA !== bB) return bA.localeCompare(bB);
      // Case-insensitive sort for room numbers
      return rA.localeCompare(rB, undefined, { sensitivity: 'base' });
  });

  const packagesInSelectedGroup = selectedRoomGroup 
    ? allPendingPackages.filter(p => 
        (p.building || '') === selectedRoomGroup.building && 
        p.room === selectedRoomGroup.room
      ) 
    : [];

  // Student Mode Logic
  const handleStudentSearch = () => {
      if (!studentSearchData.room) { alert("กรุณากรอกเลขห้อง"); return; }
      setView('studentResult');
  };
  
  // Student Search Case-Insensitive
  const studentPackages = isStudentMode && view === 'studentResult'
    ? allPendingPackages.filter(p => 
        (p.building || '') === studentSearchData.building && 
        String(p.room).toLowerCase() === studentSearchData.room.trim().toLowerCase()
      )
    : [];

  // Helpers
  const getBuildingColorClass = (bName, type = 'class') => {
      const b = config.buildings.find(x => x.name === bName);
      if (!b) return type === 'class' ? 'bg-slate-500' : 'bg-slate-50';
      const palette = COLOR_PALETTE.find(c => c.name === b.color);
      if (!palette) return type === 'class' ? 'bg-slate-500' : 'bg-slate-50';
      return type === 'class' ? palette.class : palette.bgSoft;
  };

  // Loading Screen
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 text-sm font-medium">กำลังโหลดข้อมูล...</p>
    </div>
  );

  if (dbError) return (
    <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
      <Database className="w-16 h-16 text-red-400 mb-4" />
      <h2 className="text-lg font-bold text-red-800 mb-2">เชื่อมต่อฐานข้อมูลไม่ได้</h2>
      <p className="text-sm text-red-600 bg-white p-4 rounded-xl shadow-sm border border-red-100">{dbError}</p>
    </div>
  );

  // ==========================================
  // VIEW: STUDENT MODE
  // ==========================================
  if (isStudentMode) {
      return (
        <div className="min-h-screen bg-slate-100 text-slate-800" style={{ fontFamily: "'Kanit', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
                * { font-family: 'Kanit', sans-serif; }
            `}</style>
            <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative flex flex-col">
                {/* Student Header */}
                <div className="bg-white/90 backdrop-blur-sm p-5 shadow-sm sticky top-0 z-10 flex justify-between items-center">
                    <h1 className="text-xl font-extrabold text-indigo-600 flex items-center gap-2">
                        <Box className="w-6 h-6" /> DormDrop <span className="text-xs bg-indigo-100 px-2 py-0.5 rounded-full text-indigo-600 font-normal">Student</span>
                    </h1>
                    {view === 'studentResult' && (
                        <button onClick={() => { setView('studentSearch'); setSelectedPackages([]); }} className="text-sm text-slate-500 hover:text-indigo-600">
                            กลับไปค้นหา
                        </button>
                    )}
                </div>

                <div className="p-6 flex-1">
                    {view === 'studentSearch' && (
                        <div className="flex flex-col justify-center h-[70vh] animate-fade-in">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-500 shadow-sm">
                                    <Search className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">ค้นหาพัสดุของคุณ</h2>
                                <p className="text-slate-400 mt-1 text-sm">เลือกตึกและกรอกเลขห้องเพื่อตรวจสอบ</p>
                            </div>

                            <div className="space-y-4 bg-white p-6 rounded-3xl shadow-xl shadow-slate-100 border border-slate-50">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 ml-2">ตึก</label>
                                    <div className="relative">
                                        <select
                                            value={studentSearchData.building}
                                            onChange={(e) => setStudentSearchData(p => ({...p, building: e.target.value}))}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl appearance-none font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            {config.buildings.length === 0 && <option value="">-</option>}
                                            {config.buildings.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-5 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 ml-2">เลขห้อง</label>
                                    <input
                                        type="text"
                                        placeholder="เช่น A1, K2, Q3..."
                                        value={studentSearchData.room}
                                        onChange={(e) => setStudentSearchData(p => ({...p, room: e.target.value}))}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-2xl font-bold text-center tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={handleStudentSearch}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 mt-4 active:scale-95 transition-all"
                                >
                                    ตรวจสอบพัสดุ
                                </button>
                            </div>
                            <div className="text-center mt-8">
                                <button onClick={() => { setIsStudentMode(false); setView('list'); }} className="text-xs text-slate-300 underline">
                                    เข้าสู่ระบบเจ้าหน้าที่
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'studentResult' && (
                        <div className="animate-fade-in pb-24">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                📦 รายการพัสดุ 
                                <span className={`text-xs px-2 py-0.5 rounded text-white ${getBuildingColorClass(studentSearchData.building, 'class')}`}>
                                    ตึก {studentSearchData.building}
                                </span>
                                ห้อง {studentSearchData.room}
                            </h2>

                            {studentPackages.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>ไม่พบพัสดุที่รอรับ</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {studentPackages.map(pkg => {
                                        const isSelected = selectedPackages.some(p => p.id === pkg.id);
                                        return (
                                            <div 
                                                key={pkg.id} 
                                                onClick={() => {
                                                    if (isSelected) setSelectedPackages(prev => prev.filter(p => p.id !== pkg.id));
                                                    else setSelectedPackages(prev => [...prev, pkg]);
                                                }}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-center ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <CarrierBadge carrier={pkg.carrier} />
                                                        <span className="text-sm font-bold text-slate-800 truncate">{pkg.tracking}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex gap-2">
                                                        <span>ประเภท: {pkg.type}</span>
                                                        {pkg.sender && <span>จาก: {pkg.sender}</span>}
                                                    </div>
                                                </div>
                                                {pkg.image && <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden"><img src={pkg.image} className="w-full h-full object-cover" /></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Student Action Bar */}
                {view === 'studentResult' && studentPackages.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] max-w-md mx-auto">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-bold text-slate-600">เลือกแล้ว {selectedPackages.length} ชิ้น</span>
                            {selectedPackages.length < studentPackages.length && (
                                <button onClick={() => setSelectedPackages(studentPackages)} className="text-xs text-indigo-600 font-bold">เลือกทั้งหมด</button>
                            )}
                        </div>
                        <button 
                            onClick={() => setSelectedPackage({})} // Dummy trigger for modal
                            disabled={selectedPackages.length === 0}
                            className="w-full py-4 bg-green-500 disabled:bg-slate-300 text-white rounded-2xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-all"
                        >
                            ยืนยันการรับของ
                        </button>
                    </div>
                )}

                {/* Student Receive Modal */}
                {selectedPackage && view === 'studentResult' && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-slide-up">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800">ลงชื่อรับพัสดุ ({selectedPackages.length} ชิ้น)</h3>
                                <button onClick={() => { setSelectedPackage(null); setSignatureImage(null); }} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">ชื่อผู้รับ</label>
                                    <input type="text" placeholder="พิมพ์ชื่อผู้รับ..." className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">ลายเซ็น</label>
                                    <SignaturePad onSave={setSignatureImage} />
                                </div>
                            </div>
                            <button onClick={handleReceivePackages} disabled={!receiverName && !signatureImage} className="w-full py-4 bg-green-500 text-white rounded-xl font-bold shadow-lg">ยืนยันรับพัสดุ</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // ==========================================
  // VIEW: ADMIN MODE
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-24 md:pb-0" style={{ fontFamily: "'Kanit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        * { font-family: 'Kanit', sans-serif; }
      `}</style>
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-5 py-4 sticky top-0 z-20 border-b border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 flex items-center gap-2">
              <Box className="w-7 h-7 text-indigo-600" fill="currentColor" />
              DormDrop
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={() => { setView('settings'); setSelectedRoomGroup(null); }} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {(view === 'list' || view === 'roomDetail' || view === 'history') && (
            <div className="flex gap-2">
                <div className="relative w-1/3">
                    <select
                        value={searchBuilding}
                        onChange={(e) => setSearchBuilding(e.target.value)}
                        className="w-full h-full pl-3 pr-8 py-3 bg-indigo-50 border-none rounded-2xl text-sm font-bold text-indigo-700 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option>ทั้งหมด</option>
                        {config.buildings.map((b, i) => <option key={i} value={b.name}>ตึก {b.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-indigo-400 pointer-events-none" />
                </div>
                <div className="relative group flex-1">
                    <input
                        type="text" placeholder="เลขห้อง..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          
          {/* SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-6 animate-fade-in pb-20">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">ตั้งค่าระบบ</h2>
              </div>
              
              {/* Student Mode Toggle */}
              <div className="bg-indigo-600 rounded-2xl p-4 shadow-lg text-white flex justify-between items-center">
                  <div>
                      <h3 className="font-bold flex items-center gap-2"><User className="w-4 h-4" /> โหมดนักศึกษา</h3>
                      <p className="text-xs text-indigo-200">สำหรับให้เด็กหอค้นหาและรับของเอง</p>
                  </div>
                  <button onClick={() => { setIsStudentMode(true); setView('studentSearch'); }} className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-md active:scale-95">
                      เปิดใช้งาน
                  </button>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Building className="w-4 h-4" /> จัดการตึก
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {config.buildings.map((b, idx) => {
                        const palette = COLOR_PALETTE.find(c => c.name === b.color) || COLOR_PALETTE[0];
                        return (
                            <div key={idx} className={`${palette.bgSoft} ${palette.text} border border-transparent px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm`}>
                                <span>ตึก {b.name}</span>
                                <button onClick={() => handleDeleteBuilding(b.name)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                            </div>
                        );
                    })}
                  </div>
                  <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                    <input 
                      type="text" placeholder="ชื่อตึก (เช่น A)"
                      className="flex-1 p-2 bg-white rounded-lg text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)}
                    />
                    <div className="relative">
                        <select 
                            value={newBuildingColor} onChange={(e) => setNewBuildingColor(e.target.value)}
                            className="appearance-none w-8 h-8 rounded-full border-2 border-white shadow-sm focus:outline-none cursor-pointer"
                            style={{ backgroundColor: newBuildingColor === 'White' ? '#fff' : newBuildingColor.toLowerCase() }}
                        >
                            {COLOR_PALETTE.map(c => <option key={c.name} value={c.name} style={{color: c.name}}>{c.name}</option>)}
                        </select>
                        <div className={`absolute inset-0 rounded-full pointer-events-none ${COLOR_PALETTE.find(c => c.name === newBuildingColor)?.class}`}></div>
                    </div>
                    <button onClick={handleAddBuilding} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                  </div>
              </div>

              {['carriers', 'types'].map((key) => (
                <div key={key} className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {key === 'carriers' ? '🚚 ขนส่ง' : '📦 ประเภท'}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {config[key].map((item, idx) => (
                      <div key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                        {item}
                        <button onClick={() => handleDeleteStringConfig(key, item)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder={`เพิ่ม...`}
                      className="flex-1 p-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => { if(e.key === 'Enter') { handleAddStringConfig(key, e.target.value); e.target.value = ''; }}}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADD / EDIT */}
          {view === 'add' && (
            <div className="animate-fade-in pb-20">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  {formData.id ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {formData.id ? 'แก้ไขข้อมูลพัสดุ' : 'เพิ่มพัสดุใหม่'}
              </h2>
              
              <form onSubmit={handleSavePackage} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ตึก</label>
                        <div className="relative h-[56px]">
                            <select
                                name="building" value={formData.building} onChange={handleInputChange}
                                className={`w-full h-full px-2 bg-slate-50 border-none rounded-2xl font-bold text-center appearance-none focus:ring-2 focus:ring-indigo-500 outline-none`}
                                disabled={config.buildings.length === 0}
                            >
                                {config.buildings.length === 0 && <option value="">-</option>}
                                {config.buildings.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                            </select>
                            {config.buildings.length > 0 && <ChevronDown className="absolute right-1 top-4 w-4 h-4 text-slate-400 pointer-events-none" />}
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">เลขห้อง *</label>
                        <input
                            type="text" name="room" required
                            value={formData.room} onChange={handleInputChange}
                            className="w-full h-[56px] px-4 bg-slate-50 border-none rounded-2xl text-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none tracking-widest placeholder:text-slate-200"
                            placeholder="304"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ขนส่ง</label>
                        <div className="relative">
                        <select name="carrier" value={formData.carrier} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl appearance-none font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                            {config.carriers.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-4 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ประเภท</label>
                        <select name="type" value={formData.type} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium outline-none text-sm appearance-none">
                        {config.types.map((t, i) => <option key={i} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">เลขพัสดุ *</label>
                  <input type="text" name="tracking" required value={formData.tracking} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ผู้ส่ง (ถ้ามี)</label>
                    <input type="text" name="sender" value={formData.sender} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 ml-1">รูปถ่ายหลักฐาน</label>
                  <div className="relative group cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                    <div className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${formData.image ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                      {formData.image ? (
                        <div className="relative w-full h-full p-2"><img src={formData.image} className="w-full h-full object-cover rounded-xl shadow-md" /></div>
                      ) : (
                        <><div className="bg-white p-3 rounded-full shadow-sm mb-2"><Camera className="w-6 h-6 text-indigo-500" /></div><span className="text-xs font-bold text-slate-400">แตะเพื่อถ่ายรูป</span></>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setView('list'); setFormData(p => ({...p, id: null})); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกพัสดุ'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ROOM LIST */}
          {view === 'list' && (
            <div className="space-y-3 pb-20">
              {sortedGroupKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <PackageIcon className="w-16 h-16 text-slate-300 mb-3" />
                  <p className="text-slate-400 font-medium">ไม่พบพัสดุ</p>
                </div>
              ) : (
                sortedGroupKeys.map(key => {
                   const [bName, rNum] = key.split('|');
                   const pkgs = groupedPackages[key];
                   
                   return (
                   <div key={key} onClick={() => { setSelectedRoomGroup({building: bName, room: rNum}); setView('roomDetail'); setSelectedPackages([]); }} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group hover:border-indigo-100 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBuildingColorClass(bName)}`}></div>
                      <div className="flex items-center gap-4 pl-3">
                          {/* UPDATED: Building Icon UI */}
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-sm font-bold text-lg ${getBuildingColorClass(bName, 'soft')} ${bName ? '' : 'bg-slate-100 text-slate-500'}`}>
                               {bName ? (
                                   <>
                                      <Building className="w-5 h-5 mb-0.5 opacity-70" />
                                      <span className="text-[10px] uppercase leading-none">{bName}</span>
                                   </>
                               ) : (
                                   <span className="text-[10px] uppercase opacity-70">?</span>
                               )}
                          </div>
                          <div>
                              <div className="flex items-center gap-2 mb-0.5"><span className="text-sm text-slate-500 font-medium">ห้อง</span></div>
                              <div className="text-2xl font-extrabold text-slate-800 flex items-baseline gap-1 leading-none">{rNum}</div>
                              <div className="text-[10px] text-slate-400 mt-1">{pkgs.length} พัสดุรอรับ</div>
                          </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50"><ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" /></div>
                   </div>
                )})
              )}
            </div>
          )}

          {/* ROOM DETAIL (ADMIN) */}
          {view === 'roomDetail' && selectedRoomGroup && (
             <div className="space-y-4 animate-fade-in pb-24 relative min-h-[80vh]">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => { setView('list'); setSelectedRoomGroup(null); }} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium text-sm pl-1"><ArrowLeft className="w-4 h-4" /> กลับหน้ารวม</button>
                    {packagesInSelectedGroup.length > 0 && (
                        <button 
                            onClick={() => {
                                if (selectedPackages.length === packagesInSelectedGroup.length) setSelectedPackages([]);
                                else setSelectedPackages(packagesInSelectedGroup);
                            }} 
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full"
                        >
                            {selectedPackages.length === packagesInSelectedGroup.length ? 'ยกเลิกเลือก' : 'เลือกทั้งหมด'}
                        </button>
                    )}
                </div>
                
                <div className={`rounded-2xl p-4 text-white shadow-lg flex items-center justify-between mb-4 ${getBuildingColorClass(selectedRoomGroup.building, 'class')}`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"><Home className="w-6 h-6 text-white" /></div>
                        <div><p className="text-xs text-white/80">{selectedRoomGroup.building ? `ตึก ${selectedRoomGroup.building}` : 'ไม่ระบุตึก'}</p><h2 className="text-2xl font-bold">ห้อง {selectedRoomGroup.room}</h2></div>
                    </div>
                    <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/10">{packagesInSelectedGroup.length} รายการ</div>
                </div>

                <div className="space-y-3 pb-16">
                   {packagesInSelectedGroup.map(pkg => {
                      const isSelected = selectedPackages.some(p => p.id === pkg.id);
                      return (
                      <div 
                        key={pkg.id} 
                        onClick={() => {
                            if (isSelected) setSelectedPackages(prev => prev.filter(p => p.id !== pkg.id));
                            else setSelectedPackages(prev => [...prev, pkg]);
                        }}
                        className={`bg-white p-4 rounded-2xl shadow-sm border transition-all flex flex-col gap-4 relative cursor-pointer ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' : 'border-slate-100'}`}
                      >
                        {/* Selection Indicator */}
                        <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-200 bg-white'}`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>

                        {/* Edit Button (Stop Propagation to prevent selection toggle) */}
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(pkg); }} className="absolute top-4 right-12 p-1.5 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-indigo-600 hover:border-indigo-200 z-10">
                            <Edit className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100 relative">
                                {pkg.image ? <img src={pkg.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><PackageIcon className="w-8 h-8" /></div>}
                            </div>
                            <div className="flex-1 min-w-0 pr-16">
                                <div className="flex items-center gap-2 mb-1"><CarrierBadge carrier={pkg.carrier} /><span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{pkg.type}</span></div>
                                <h3 className="font-bold text-slate-800 text-lg truncate mb-0.5">{pkg.tracking}</h3>
                                {pkg.sender && <p className="text-xs text-slate-500">จาก: <span className="font-medium text-slate-700">{pkg.sender}</span></p>}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50/50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md"><Clock className="w-3.5 h-3.5" /> {pkg.createdAt instanceof Date ? pkg.createdAt.toLocaleDateString('th-TH') : '...'}</div>
                        </div>
                      </div>
                   )})}
                </div>

                {/* Bulk Receive Bar */}
                {selectedPackages.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] max-w-md mx-auto animate-slide-up z-30">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-bold text-slate-600">เลือกแล้ว {selectedPackages.length} ชิ้น</span>
                        </div>
                        <button 
                            onClick={() => setSelectedPackage({})} // Trigger modal
                            className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" /> ยืนยันรับพัสดุ ({selectedPackages.length})
                        </button>
                    </div>
                )}
             </div>
          )}

          {/* HISTORY */}
          {view === 'history' && (
            <div className="space-y-4 pb-20">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">ประวัติการรับ</h2><span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">{historyPackages.length} รายการ</span></div>
              {historyPackages.length === 0 ? <div className="flex flex-col items-center justify-center py-20 opacity-50"><History className="w-16 h-16 text-slate-300 mb-3" /><p className="text-slate-400 font-medium">ไม่มีประวัติการรับ</p></div> : 
                historyPackages.map(pkg => (
                  <div key={pkg.id} onClick={() => setHistoryDetailPackage(pkg)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${getBuildingColorClass(pkg.building, 'class')}`}></div>
                    <div className="flex-1 min-w-0 pl-2">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-800">{pkg.room || "?"}</span>{pkg.building && <span className={`text-[10px] px-1.5 rounded text-white ${getBuildingColorClass(pkg.building, 'class')}`}>{pkg.building}</span>}</div>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">รับแล้ว</span>
                        </div>
                        <div className="text-xs text-slate-600 mb-1 truncate">{pkg.tracking}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400"><User className="w-3 h-3" /> {pkg.receiver || "ไม่ระบุ"} <span className="text-slate-300">•</span> <Clock className="w-3 h-3" /> {pkg.pickedUpAt instanceof Date ? pkg.pickedUpAt.toLocaleDateString('th-TH') : '-'}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Receive Modal (Shared) */}
        {selectedPackage && view !== 'studentResult' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CheckCircle className="w-6 h-6 text-green-500" /> รับของ ({selectedPackages.length} ชิ้น)</h3><button onClick={() => { setSelectedPackage(null); setSignatureImage(null); }} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button></div>
              <div className="space-y-4 mb-6">
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">ชื่อผู้รับ</label><input type="text" placeholder="พิมพ์ชื่อผู้รับ..." className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">ลายเซ็น</label><SignaturePad onSave={setSignatureImage} /></div>
              </div>
              <button onClick={() => { handleReceivePackages(); }} disabled={!receiverName && !signatureImage} className="w-full py-4 bg-green-500 text-white rounded-xl font-bold shadow-lg">ยืนยันรับพัสดุ</button>
            </div>
          </div>
        )}

        {/* History Detail Modal */}
        {historyDetailPackage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-bold text-slate-800">รายละเอียด</h3><button onClick={() => setHistoryDetailPackage(null)} className="p-2 bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-500" /></button></div>
                  <div className="space-y-5">
                      <div className="w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">{historyDetailPackage.image ? <img src={historyDetailPackage.image} className="w-full h-full object-contain" /> : <div className="flex flex-col items-center text-slate-300"><Camera className="w-10 h-10 mb-2" /><span className="text-xs">ไม่มีรูปภาพ</span></div>}</div>
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                          <div className="flex items-center gap-2 mb-3"><div className="bg-green-200 p-1.5 rounded-full text-green-700"><User className="w-4 h-4" /></div><span className="font-bold text-green-800 text-sm">ข้อมูลผู้รับ</span></div>
                          <div className="flex justify-between items-center mb-2"><span className="text-xs text-green-600">ชื่อ:</span><span className="font-bold text-green-800">{historyDetailPackage.receiver}</span></div>
                          <div className="flex justify-between items-center mb-3"><span className="text-xs text-green-600">เวลา:</span><span className="text-xs font-medium text-green-800">{historyDetailPackage.pickedUpAt instanceof Date ? historyDetailPackage.pickedUpAt.toLocaleDateString('th-TH') : '-'}</span></div>
                          {historyDetailPackage.signature && <div className="bg-white p-2 rounded-xl border border-green-100"><img src={historyDetailPackage.signature} className="h-12 w-auto mx-auto" /></div>}
                      </div>
                  </div>
              </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-6 pb-6 pt-2 md:pb-2 flex justify-between items-end max-w-md mx-auto z-40">
          <button onClick={() => { setView('list'); setSelectedRoomGroup(null); }} className={`flex flex-col items-center gap-1 p-2 transition-all ${view === 'list' || view === 'roomDetail' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-400'}`}><Home className="w-6 h-6" /><span className="text-[10px] font-bold">หน้าหลัก</span></button>
          <button onClick={() => { setView('add'); setSelectedRoomGroup(null); setFormData(p => ({...p, id: null, tracking: '', room: '', image: null})); }} className="flex flex-col items-center justify-center -mt-8 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-full w-16 h-16 shadow-lg shadow-indigo-300 border-4 border-slate-50 transform transition-transform hover:scale-110 active:scale-95"><Plus className="w-8 h-8" /></button>
          <button onClick={() => { setView('history'); setSelectedRoomGroup(null); }} className={`flex flex-col items-center gap-1 p-2 transition-all ${view === 'history' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-400'}`}><History className="w-6 h-6" /><span className="text-[10px] font-bold">ประวัติ</span></button>
        </div>

      </div>
    </div>
  );
}

// Wrap App in ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <DormDropApp />
    </ErrorBoundary>
  );
}