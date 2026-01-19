import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
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
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Camera, 
  Clock, 
  CheckCircle, 
  Box, 
  User, 
  X,
  History,
  Home,
  Settings,
  PenTool,
  Eraser,
  Save,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Database
} from 'lucide-react';

// ==========================================
// ส่วนที่ 1: การตั้งค่า
// ==========================================

// Config ของคุณ (จะถูกบังคับใช้เป็นอันดับแรก)
const MY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFah-LOjrjtqm3JqVZAQ88S9KTlVtprb8",
  authDomain: "dormdrop-c016b.firebaseapp.com",
  projectId: "dormdrop-c016b",
  storageBucket: "dormdrop-c016b.firebasestorage.app",
  messagingSenderId: "423788710268",
  appId: "1:423788710268:web:865810081da14be753bcf9"
};

// ==========================================
// ส่วนที่ 2: ระบบจัดการ Firebase
// ==========================================

let app, auth, db;
let appId = 'dorm-main'; // ใช้ ID คงที่เพื่อให้หาข้อมูลเจอใน Database ของคุณ
let initError = null;

try {
  // แก้ไข: ให้ความสำคัญกับ Config ของผู้ใช้ก่อนเสมอ
  let config = MY_FIREBASE_CONFIG;
  
  // ถ้าผู้ใช้ไม่ได้ใส่ Config มา ค่อยไปใช้ของระบบ (Fallback)
  if (!config && typeof __firebase_config !== 'undefined') {
    config = JSON.parse(__firebase_config);
    if (typeof __app_id !== 'undefined') appId = __app_id;
  }

  // เริ่มต้น Firebase
  if (config) {
    app = !getApps().length ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    throw new Error("ไม่พบการตั้งค่า Firebase");
  }
} catch (e) {
  initError = e.message;
  console.error("Firebase Init Error:", e);
}

// ==========================================
// ส่วนที่ 3: Components ช่วยเหลือ
// ==========================================

// Error Boundary
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
          <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
          <pre className="bg-white p-4 rounded border border-red-200 text-xs text-left w-full overflow-auto">
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
            รีโหลดหน้าจอ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Signature Pad
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
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
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
    if (onSave && canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
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
    <div className="relative w-full h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden touch-none">
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
      <button type="button" onClick={clearCanvas} className="absolute top-2 right-2 p-1 bg-white shadow rounded-full text-gray-500 hover:text-red-500">
        <Eraser className="w-4 h-4" />
      </button>
      <div className="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">เซ็นชื่อที่นี่</div>
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
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ==========================================
// ส่วนที่ 4: Main Application
// ==========================================

function DormDropApp() {
  const [user, setUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [view, setView] = useState('list'); 
  const [selectedRoom, setSelectedRoom] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // Modals state
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [historyDetailPackage, setHistoryDetailPackage] = useState(null);

  // Settings
  const [config, setConfig] = useState({
    carriers: ['Kerry', 'Flash', 'Thai Post', 'J&T', 'Lazada', 'Shopee', 'อื่นๆ'],
    types: ['กล่อง', 'ซอง', 'ถุง', 'อาหาร/น้ำ', 'ใหญ่พิเศษ']
  });

  // Form State
  const [formData, setFormData] = useState({
    room: '',
    tracking: '',
    carrier: '', 
    type: '', 
    sender: '',
    image: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Receive Form State
  const [receiverName, setReceiverName] = useState('');
  const [signatureImage, setSignatureImage] = useState(null);

  // --- Auth & Initial Data ---
  useEffect(() => {
    if (!auth) return; 

    const initAuth = async () => {
        try {
            // Priority: Config user -> Auth user
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Auth Error:", error);
            setDbError("ไม่สามารถเข้าสู่ระบบได้: " + error.message);
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Packages
  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    setDbError(null);

    // Using user's specific path
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
        console.error("Snapshot Error:", error);
        setLoading(false);
        if (error.code === 'permission-denied') {
            setDbError("เข้าถึงข้อมูลไม่ได้: กรุณาปรับแก้ Firestore Rules เป็น 'allow read, write: if true;'");
        } else {
            setDbError("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
        }
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Settings
  useEffect(() => {
    if (!user || !db) return;
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig({
          carriers: Array.isArray(data.carriers) ? data.carriers : config.carriers,
          types: Array.isArray(data.types) ? data.types : config.types
        });
        if (data.carriers?.length > 0 && !formData.carrier) {
           setFormData(prev => ({ ...prev, carrier: data.carriers[0] }));
        }
        if (data.types?.length > 0 && !formData.type) {
           setFormData(prev => ({ ...prev, type: data.types[0] }));
        }
      } else {
        setDoc(configDocRef, config).catch(err => console.error("Error init config:", err));
        if(!formData.carrier) setFormData(prev => ({ ...prev, carrier: config.carriers[0] }));
        if(!formData.type) setFormData(prev => ({ ...prev, type: config.types[0] }));
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
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
      }
    }
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    if (!formData.room || !formData.tracking) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'packages'), {
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp(),
        receiver: '',
        signature: null,
        pickedUpAt: null
      });

      setFormData(prev => ({
        ...prev,
        room: '',
        tracking: '',
        sender: '',
        image: null
      }));
      setView('list');
      setSelectedRoom(null);
    } catch (err) {
      console.error("Add package error:", err);
      alert("บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceivePackage = async () => {
    if (!selectedPackage) return;
    if (!receiverName && !signatureImage) {
        alert("กรุณาระบุชื่อผู้รับ หรือ เซ็นชื่อ");
        return;
    }

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'packages', selectedPackage.id);
      await updateDoc(docRef, {
        status: 'picked_up',
        receiver: receiverName,
        signature: signatureImage,
        pickedUpAt: serverTimestamp()
      });
      setSelectedPackage(null);
      setReceiverName('');
      setSignatureImage(null);
    } catch (err) {
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const handleAddConfig = async (key, value) => {
    if (!value.trim()) return;
    const currentArray = config[key] || [];
    const newConfig = { ...config, [key]: [...currentArray, value] };
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig);
    } catch (e) { console.error(e); }
  };

  const handleDeleteConfig = async (key, value) => {
    const currentArray = config[key] || [];
    const newConfig = { ...config, [key]: currentArray.filter(item => item !== value) };
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig);
    } catch (e) { console.error(e); }
  };

  // --- Logic ---
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
    (String(p.room).includes(searchTerm) || String(p.tracking).includes(searchTerm))
  );

  const getGroupedPackages = () => {
    const grouped = {};
    allPendingPackages.forEach(pkg => {
      const room = pkg.room;
      if (searchTerm) {
        const matchesRoom = String(room).includes(searchTerm);
        const matchesTracking = String(pkg.tracking).includes(searchTerm);
        const matchesCarrier = String(pkg.carrier).includes(searchTerm);
        if (!matchesRoom && !matchesTracking && !matchesCarrier) return;
      }
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(pkg);
    });
    return grouped;
  };

  const groupedPackages = getGroupedPackages();
  const roomKeys = Object.keys(groupedPackages).sort();

  const packagesInSelectedRoom = selectedRoom 
    ? allPendingPackages.filter(p => p.room === selectedRoom) 
    : [];

  // --- Render Components ---
  const CarrierBadge = ({ carrier }) => {
    const colors = {
      'Kerry': 'bg-orange-100 text-orange-700',
      'Flash': 'bg-yellow-100 text-yellow-700',
      'Thai Post': 'bg-red-100 text-red-700',
      'J&T': 'bg-red-50 text-red-600',
      'Lazada': 'bg-blue-100 text-blue-700',
      'Shopee': 'bg-orange-50 text-orange-600',
      'อื่นๆ': 'bg-gray-100 text-gray-700',
    };
    const carrierName = typeof carrier === 'string' ? carrier : 'อื่นๆ';
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[carrierName] || colors['อื่นๆ']}`}>
        {carrierName}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500">กำลังเชื่อมต่อฐานข้อมูล...</p>
      </div>
    );
  }

  // Show Database Error if any
  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-yellow-50">
        <Database className="w-16 h-16 text-yellow-600 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-yellow-800">เชื่อมต่อฐานข้อมูลไม่ได้</h2>
        <div className="bg-white p-4 rounded-lg border border-yellow-200 shadow-sm max-w-sm text-left">
             <p className="text-sm text-gray-700 mb-2 font-semibold">สาเหตุที่พบบ่อย:</p>
             <p className="text-sm text-red-600 mb-2">{dbError}</p>
             <hr className="my-2"/>
             <p className="text-xs text-gray-500">
                วิธีแก้: ไปที่ Firebase Console {'>'} Firestore Database {'>'} Rules แล้วเปลี่ยนเป็น <code>allow read, write: if true;</code>
             </p>
        </div>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-lg">
            ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20 max-w-md mx-auto shadow-xl relative">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Box className="w-6 h-6 text-blue-600" />
            DormDrop
          </h1>
          <div className="flex items-center gap-3">
             {allPendingPackages.length > 0 && (
                <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                   {allPendingPackages.length} ชิ้น
                </div>
             )}
             <button onClick={() => { setView('settings'); setSelectedRoom(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
               <Settings className="w-5 h-5 text-gray-600" />
             </button>
          </div>
        </div>
        {(view === 'list' || view === 'roomDetail' || view === 'history') && (
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาเลขห้อง หรือ เลขพัสดุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
          <div className="bg-white rounded-xl p-4 shadow-sm animate-fade-in space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">ตั้งค่าระบบ</h2>
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">รายชื่อขนส่ง</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                    {config.carriers.map((c, idx) => (
                        <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                            {typeof c === 'string' ? c : 'Error'}
                            <button onClick={() => handleDeleteConfig('carriers', c)}><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="เพิ่มขนส่ง..." 
                        className="flex-1 p-2 border rounded-lg text-sm"
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                                handleAddConfig('carriers', e.target.value);
                                e.target.value = '';
                            }
                        }}
                    />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">ประเภทพัสดุ</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                    {config.types.map((t, idx) => (
                        <div key={idx} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                             {typeof t === 'string' ? t : 'Error'}
                            <button onClick={() => handleDeleteConfig('types', t)}><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="เพิ่มประเภท..." 
                        className="flex-1 p-2 border rounded-lg text-sm"
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                                handleAddConfig('types', e.target.value);
                                e.target.value = '';
                            }
                        }}
                    />
                </div>
            </div>
          </div>
        )}

        {/* VIEW: ADD PACKAGE */}
        {view === 'add' && (
          <div className="bg-white rounded-xl p-4 shadow-sm animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> เพิ่มพัสดุใหม่
            </h2>
            <form onSubmit={handleAddPackage} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">เลขห้อง *</label>
                  <input
                    type="text"
                    name="room"
                    required
                    value={formData.room}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="เช่น 304"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ขนส่ง</label>
                  <select
                    name="carrier"
                    value={formData.carrier}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white outline-none"
                  >
                    {config.carriers.map((c, i) => (
                        <option key={i} value={c}>{typeof c === 'string' ? c : 'N/A'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เลขพัสดุ (4 ตัวท้ายก็ได้) *</label>
                <input
                  type="text"
                  name="tracking"
                  required
                  value={formData.tracking}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="สแกน หรือ พิมพ์"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ประเภท</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white outline-none"
                  >
                     {config.types.map((t, i) => (
                        <option key={i} value={t}>{typeof t === 'string' ? t : 'N/A'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อผู้ส่ง (ถ้ามี)</label>
                  <input
                    type="text"
                    name="sender"
                    value={formData.sender}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none"
                    placeholder="เช่น แม่"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">รูปถ่ายพัสดุ</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  />
                  <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mb-1 text-blue-500" />
                        <span className="text-xs font-semibold text-blue-600">กดเพื่อถ่ายรูป</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-200"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกพัสดุ'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: ROOM LIST */}
        {view === 'list' && (
          <div className="space-y-3">
            {roomKeys.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ไม่มีพัสดุตกค้าง</p>
              </div>
            ) : (
              roomKeys.map(room => (
                 <div 
                    key={room}
                    onClick={() => { setSelectedRoom(room); setView('roomDetail'); }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                 >
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                             <Home className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-800">ห้อง {room}</div>
                            <div className="text-sm text-gray-500">
                                {groupedPackages[room].length} พัสดุ
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                 </div>
              ))
            )}
          </div>
        )}

        {/* VIEW: ROOM DETAIL */}
        {view === 'roomDetail' && selectedRoom && (
           <div className="space-y-4 animate-fade-in">
              <button 
                onClick={() => { setView('list'); setSelectedRoom(null); }}
                className="flex items-center gap-1 text-gray-600 mb-2 hover:text-blue-600"
              >
                  <ArrowLeft className="w-4 h-4" /> กลับหน้ารวม
              </button>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <Home className="w-5 h-5 text-blue-600" /> ห้อง {selectedRoom}
              </h2>
              <div className="space-y-3">
                 {packagesInSelectedRoom.map(pkg => (
                    <div key={pkg.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CarrierBadge carrier={pkg.carrier} />
                            <span className="text-sm font-semibold text-gray-800">{pkg.tracking}</span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Box className="w-3 h-3" /> {pkg.type}
                        </p>
                        {pkg.sender && (
                            <p className="text-xs text-gray-500 mt-1">ผู้ส่ง: {pkg.sender}</p>
                        )}
                        </div>
                        {pkg.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <img src={pkg.image} alt="Package" className="w-full h-full object-cover" />
                        </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 
                        {pkg.createdAt instanceof Date ? pkg.createdAt.toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                        <button
                        onClick={() => setSelectedPackage(pkg)}
                        className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg shadow-sm active:scale-95 transition-transform flex items-center gap-1"
                        >
                        <CheckCircle className="w-4 h-4" /> รับของ
                        </button>
                    </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">ประวัติย้อนหลัง 1 เดือน</h2>
            {historyPackages.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>ไม่มีประวัติ</p>
              </div>
            ) : (
              historyPackages.map(pkg => (
                <div key={pkg.id} onClick={() => setHistoryDetailPackage(pkg)} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="font-bold text-gray-700">ห้อง {pkg.room}</span>
                      <span className="text-xs text-gray-500 mx-2">|</span>
                      <span className="text-sm text-gray-600">{pkg.tracking}</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full h-fit">รับแล้ว</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 flex justify-between items-center">
                    <div>
                        {pkg.receiver && <div>ผู้รับ: {pkg.receiver}</div>}
                        <div>เวลา: {pkg.pickedUpAt instanceof Date ? pkg.pickedUpAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Receive Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">ยืนยันการรับพัสดุ</h3>
              <button onClick={() => { setSelectedPackage(null); setSignatureImage(null); }} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
              <p><strong>ห้อง:</strong> {selectedPackage.room}</p>
              <p><strong>พัสดุ:</strong> {selectedPackage.tracking}</p>
            </div>
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้รับ (ตัวบรรจง)</label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย"
                  className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <PenTool className="w-3 h-3" /> ลายเซ็น
                </label>
                <SignaturePad onSave={setSignatureImage} />
              </div>
            </div>
            <button
              onClick={handleReceivePackage}
              disabled={!receiverName && !signatureImage}
              className="w-full py-3 bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> ยืนยันรับของ
            </button>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {historyDetailPackage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">ประวัติการรับพัสดุ</h3>
                    <button onClick={() => setHistoryDetailPackage(null)} className="p-1 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            <Box className="w-4 h-4" /> ข้อมูลพัสดุ
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                            <div className="flex justify-between"><span>ห้อง:</span> <span className="font-bold">{historyDetailPackage.room}</span></div>
                            <div className="flex justify-between"><span>พัสดุ:</span> <span className="font-bold">{historyDetailPackage.tracking}</span></div>
                            <div className="flex justify-between"><span>ขนส่ง:</span> <span>{historyDetailPackage.carrier}</span></div>
                            <div className="flex justify-between"><span>ประเภท:</span> <span>{historyDetailPackage.type}</span></div>
                        </div>
                    </div>
                    {historyDetailPackage.image && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                                <Camera className="w-4 h-4" /> รูปถ่ายพัสดุ
                            </h4>
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                                <img src={historyDetailPackage.image} alt="Package" className="w-full object-cover" />
                            </div>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            <User className="w-4 h-4" /> ผู้รับของ
                        </h4>
                        <div className="bg-green-50 p-3 rounded-lg text-sm border border-green-100 space-y-2">
                            <div className="flex justify-between items-center">
                                <span>ชื่อผู้รับ:</span>
                                <span className="font-bold text-green-800">{historyDetailPackage.receiver}</span>
                            </div>
                            {historyDetailPackage.signature && (
                                <div className="pt-2 border-t border-green-200">
                                    <span className="text-xs text-gray-500 block mb-1">ลายเซ็น:</span>
                                    <img src={historyDetailPackage.signature} alt="Signature" className="h-12 bg-white border border-gray-200 rounded p-1" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center max-w-md mx-auto z-40">
        <button onClick={() => { setView('list'); setSelectedRoom(null); }} className={`flex flex-col items-center gap-1 p-2 ${view === 'list' || view === 'roomDetail' ? 'text-blue-600' : 'text-gray-400'}`}>
          <Home className="w-6 h-6" /><span className="text-[10px]">หน้าหลัก</span>
        </button>
        <button onClick={() => { setView('add'); setSelectedRoom(null); }} className="flex flex-col items-center justify-center -mt-8 bg-blue-600 text-white rounded-full w-14 h-14 shadow-lg shadow-blue-300 border-4 border-gray-100">
          <Plus className="w-8 h-8" />
        </button>
        <button onClick={() => { setView('history'); setSelectedRoom(null); }} className={`flex flex-col items-center gap-1 p-2 ${view === 'history' ? 'text-blue-600' : 'text-gray-400'}`}>
          <History className="w-6 h-6" /><span className="text-[10px]">ประวัติ</span>
        </button>
      </div>
    </div>
  );
}

// Wrapper to catch init errors
export default function App() {
  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">ยังไม่ได้ตั้งค่า Firebase</h2>
        <p className="text-gray-600 mb-4">
          กรุณาเปิดไฟล์ <code>src/App.jsx</code> แล้วแก้ไขตัวแปร <br/>
          <code className="bg-gray-100 px-2 py-1 rounded">const MY_FIREBASE_CONFIG = ...</code> <br/>
          ที่บรรทัดบนสุดด้วยค่าจาก Firebase Console ของคุณ
        </p>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <DormDropApp />
    </ErrorBoundary>
  );
}