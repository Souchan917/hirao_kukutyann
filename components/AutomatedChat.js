import React, { useState, useEffect } from 'react';
import { saveMessage } from '../libs/firebase';

const AutomatedChat = () => {
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState('');
  
  // 質問リスト
  const questions = [
    "子どもの夜泣きが心配です。どうしたらいいですか？",
    "離乳食はいつから始めればいいですか？",
    "子どもの発達が遅いように感じます。様子を見ていていいですか？",
    "上の子が下の子に意地悪をします。どう対応すればいいですか？",
    "保育園に行きたがらないのですが、どうしたらいいでしょうか？"
  ];

  useEffect(() => {
    if (running && currentIndex < questions.length) {
      sendNextQuestion();
    }
  }, [running, currentIndex]);

  const startAutomation = () => {
    setSessionId(`auto-session-${Date.now()}`);
    setRunning(true);
    setCurrentIndex(0);
  };

  const sendNextQuestion = async () => {
    try {
      const question = questions[currentIndex];
      
      // 質問をFirebaseに保存
      await saveMessage(question, "user", sessionId);

      // APIにリクエスト送信
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId
        },
        body: JSON.stringify({
          userMessage: question,
          conversationSummary: ""
        })
      });

      const data = await response.json();
      
      // 応答をFirebaseに保存
      await saveMessage(JSON.stringify({
        message: data.reply,
        messageType: data.type,
        timestamp: new Date().toISOString()
      }), "ai", sessionId);

      // 次の質問へ
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 2000);

    } catch (error) {
      console.error('Error in automation:', error);
      setRunning(false);
    }
  };

  return (
    <div className="p-4">
      <button 
        onClick={startAutomation}
        disabled={running}
        className="bg-blue-500 text-white p-2 rounded"
      >
        自動質問開始
      </button>
      <div className="mt-4">
        進捗: {currentIndex}/{questions.length}
      </div>
    </div>
  );
};

export default AutomatedChat;