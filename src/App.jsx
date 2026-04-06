import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const API_BASE = 'https://learn-english-wa5d.onrender.com';

const App = () => {
  const [activeTab, setActiveTab] = useState('Chaining');
  const [loading, setLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [aiChainingHint, setAiChainingHint] = useState('');
  const [chainingFeedback, setChainingFeedback] = useState('');
  const [hintLoading, setHintLoading] = useState(true);
  const [chainingInput, setChainingInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [masteryInput, setMasteryInput] = useState('');
  const [masteryResult, setMasteryResult] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/questions`);
        const data = await response.json();
        if (data.status === 'success' && data.data.length > 0) {
          const q = data.data[Math.floor(Math.random() * data.data.length)];
          setCurrentQuestion(q);
          const qText = q.Chinese || q.chinese || q.Question;
          
          fetch(`${API_BASE}/api/generate_hint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: qText })
          }).then(res => res.json()).then(d => {
             if (d.status === 'success') setAiChainingHint(d.hint);
             setHintLoading(false);
          });
          setChatHistory([{ role: 'model', content: `哈囉！我是翻譯家教。這句：「${qText}」，試試看先翻出主動詞？` }]);
        }
      } catch (error) {
        setCurrentQuestion({ Chinese: "我們最好現在就出發，以免遇到塞車。" });
        setAiChainingHint("可以先試著翻「我們最好現在就出發」。");
        setHintLoading(false);
      } finally {
        setTimeout(() => setQuestionLoading(false), 800);
      }
    };
    fetchQuestions();
  }, []);

  const handleLog = async (sheetName, rowData) => {
    try {
      await fetch(`${API_BASE}/api/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 12345'
        },
        body: JSON.stringify({ sheet_name: sheetName, row_data: rowData })
      });
    } catch (e) {}
  };

  const submitChaining = async () => {
    if (!chainingInput.trim() || loading) return;
    setLoading(true);
    setChainingFeedback('AI 助教正在批改中...');
    try {
      const qText = currentQuestion?.Chinese || currentQuestion?.chinese;
      const res = await fetch(`${API_BASE}/api/eval_chaining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qText, input: chainingInput })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setChainingFeedback(data.feedback);
        handleLog('Chaining', [new Date().toLocaleString(), qText, chainingInput, data.feedback]);
      }
    } catch (e) { alert('評核失敗'); }
    finally { setLoading(false); }
  };

  const submitMastery = async () => {
    if (!masteryInput.trim() || loading) return;
    setLoading(true);
    try {
      const qText = currentQuestion?.Chinese || currentQuestion?.chinese;
      const res = await fetch(`${API_BASE}/api/eval_mastery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qText, input: masteryInput })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMasteryResult(data.data);
        handleLog('Mastery', [new Date().toLocaleString(), qText, masteryInput, data.data.score]);
      }
    } catch (e) { alert('閱卷失敗'); }
    finally { setLoading(false); }
  };

  const submitChat = async () => {
    if (!chatInput.trim() || loading) return;
    const newHistory = [...chatHistory, { role: 'user', content: chatInput }];
    setChatHistory(newHistory); setChatInput(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setChatHistory(prev => [...prev, { role: 'model', content: data.reply }]);
        handleLog('Socratic', [new Date().toLocaleString(), 'Chat', chatInput, data.reply]);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  if (questionLoading) {
    return <div className="app-container"><div className="loading-screen"><div className="loader-icon"/><div className="title">載入題庫中...</div></div></div>;
  }

  const qText = currentQuestion?.Chinese || currentQuestion?.chinese || "讀取中";

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">學測英文翻譯 AI 訓練</h1>
        <div className="tabs">
          {['Chaining', 'Socratic', 'Mastery'].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => {setActiveTab(tab); setMasteryResult(null); setChainingFeedback('');}}>
              {tab === 'Chaining' ? '逐步引導' : tab === 'Socratic' ? '對話教學' : '精熟測驗'}
            </button>
          ))}
        </div>
      </header>

      <div className="content-area">
        {activeTab === 'Chaining' && (
          <>
            <div className="instruction-box">
              <div style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>題目：{qText}</div>
              <div style={{marginTop: '12px', color: 'var(--primary)', fontWeight:600}}>AI 老師初學者提示：</div>
              <div>{hintLoading ? "正在思考..." : aiChainingHint}</div>
            </div>
            {chainingFeedback && (
              <div className="ai-feedback-box" style={{background: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                <div style={{color: '#10b981', fontWeight: 600, marginBottom: '4px'}}>助教回饋：</div>
                {chainingFeedback}
              </div>
            )}
            <textarea className="custom-input" rows="3" placeholder="請練習翻譯..." value={chainingInput} onChange={(e) => setChainingInput(e.target.value)} />
            <button className="action-btn" onClick={submitChaining} disabled={loading}>提交並批改</button>
          </>
        )}

        {activeTab === 'Socratic' && (
          <>
            <div className="chat-window">
              {chatHistory.map((m, i) => <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>)}
              {loading && <div className="loading-indicator">思考中...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-wrapper">
              <input className="custom-input" placeholder="說點什麼..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitChat()} />
              <button className="action-btn" style={{marginTop:0}} onClick={submitChat} disabled={loading}>送出</button>
            </div>
          </>
        )}

        {activeTab === 'Mastery' && (
          <>
            <div className="instruction-box" style={{textAlign:'center'}}>
              <div style={{fontSize: '1.4rem', fontWeight:600}}>「{qText}」</div>
            </div>
            {!masteryResult ? (
              <>
                <textarea className="custom-input" rows="4" placeholder="寫下完整翻譯..." value={masteryInput} onChange={(e) => setMasteryInput(e.target.value)} />
                <button className="action-btn" onClick={submitMastery} disabled={loading}>大考閱卷開始</button>
              </>
            ) : (
              <div className="score-card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                  <div style={{fontSize:'1.2rem', fontWeight:600}}>測驗成績單</div>
                  <div className="score-points" style={{color:'#fbbf24', fontSize:'2.5rem'}}>{masteryResult.score} / 5</div>
                </div>
                <div style={{marginBottom:'15px'}}>
                  <div style={{color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'4px'}}>錯誤檢討:</div>
                  <ul style={{margin:0, color:'#fca5a5'}}>{masteryResult.mistakes.map((m,i)=><li key={i}>{m}</li>)}</ul>
                </div>
                <div style={{marginBottom:'15px'}}>
                   <div style={{color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'4px'}}>優點肯定:</div>
                   <ul style={{margin:0, color:'#86efac'}}>{masteryResult.good_points.map((g,i)=><li key={i}>{g}</li>)}</ul>
                </div>
                <div style={{padding:'15px', background:'rgba(0,0,0,0.2)', borderRadius:'10px', border:'1px dashed var(--glass-border)'}}>
                   <div style={{color:'var(--text-muted)', fontSize:'0.8rem', marginBottom:'4px'}}>標準答案範例:</div>
                   <div style={{fontFamily:'serif', color:'#fff'}}>{masteryResult.standard_answer}</div>
                </div>
                <button className="action-btn" style={{width:'100%', marginTop:'20px'}} onClick={() => {setMasteryResult(null); setMasteryInput('');}}>再挑戰一次</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;