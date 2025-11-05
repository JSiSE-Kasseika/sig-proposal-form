import React, { useState, useEffect } from 'react';

const App = () => {
  const [validationErrors, setValidationErrors] = useState([]);
  const [formData, setFormData] = useState({
    submissionDate: '',
    sigNameJa: '',
    sigNameEn: '',
    sigAbbreviation: '',
    leadSecretary: { name: '', affiliation: '', email: '' },
    proposers: [
      { role: '幹事', name: '', affiliation: '', email: '' },
      { role: '幹事', name: '', affiliation: '', email: '' }
    ],
    overview: '',
    questions: [''],
    expectedEffects: '',
    firstClassPromotion: '', // '希望する' or '希望しない'
    plannedSessions: {
      spring: false,
      summer: false,
      national: false,
      autumn: false,
      winter: false,
      special: false
    },
    sessionDetails: {
      target: '',
      name: '',
      overview: '',
      keywords: '',
      presenters: ''
    },
    schedule: [
      { month: '4月', activities: '' },
      { month: '6月', activities: '' },
      { month: '9月', activities: '' },
      { month: '12月', activities: '' },
      { month: '3月', activities: '' }
    ]
  });

  // ローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem('sigProposalData');
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error('データの読み込みに失敗しました', e);
      }
    }
  }, []);

  // ローカルストレージに自動保存
  useEffect(() => {
    localStorage.setItem('sigProposalData', JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  // 筆頭幹事管理
  const updateLeadSecretary = (field, value) => {
    setFormData(prev => ({
      ...prev,
      leadSecretary: { ...prev.leadSecretary, [field]: value }
    }));
  };

  // 提案者管理
  const addProposer = () => {
    setFormData(prev => ({
      ...prev,
      proposers: [...prev.proposers, { role: 'メンバー', name: '', affiliation: '', email: '' }]
    }));
  };

  const updateProposer = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      proposers: prev.proposers.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const removeProposer = (index) => {
    // 最低2名（筆頭幹事以外）は必要
    if (formData.proposers.length > 2) {
      setFormData(prev => ({
        ...prev,
        proposers: prev.proposers.filter((_, i) => i !== index)
      }));
    }
  };

  // 学術的問い管理
  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, '']
    }));
  };

  const updateQuestion = (index, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? value : q)
    }));
  };

  const removeQuestion = (index) => {
    if (formData.questions.length > 1) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  // スケジュール管理
  const addScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, { month: '', activities: '' }]
    }));
  };

  const updateSchedule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const removeSchedule = (index) => {
    if (formData.schedule.length > 1) {
      setFormData(prev => ({
        ...prev,
        schedule: prev.schedule.filter((_, i) => i !== index)
      }));
    }
  };

  // 企画セッション選択管理
  const handleSessionCheckbox = (sessionKey) => {
    setFormData(prev => ({
      ...prev,
      plannedSessions: {
        ...prev.plannedSessions,
        [sessionKey]: !prev.plannedSessions[sessionKey]
      }
    }));
  };

  // JSONエクスポート
  const exportData = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `sig-proposal-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // JSONインポート
  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          setFormData(imported);
          alert('データを読み込みました');
        } catch (error) {
          alert('ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
    }
  };

  // データクリア
  const clearData = () => {
    if (window.confirm('すべてのデータをクリアしてもよろしいですか？')) {
      localStorage.removeItem('sigProposalData');
      window.location.reload();
    }
  };

  // データ検証
  const validateData = () => {
    const errors = [];

    // 提案日
    if (!formData.submissionDate) {
      errors.push('提案日が入力されていません');
    }

    // SIG名称
    if (!formData.sigNameJa) {
      errors.push('正式名称（和）が入力されていません');
    }
    if (!formData.sigNameEn) {
      errors.push('正式名称（英）が入力されていません');
    }
    if (!formData.sigAbbreviation) {
      errors.push('略称が入力されていません');
    } else {
      // 略称は半角アルファベット2～5文字
      const abbrevPattern = /^[A-Za-z]{2,5}$/;
      if (!abbrevPattern.test(formData.sigAbbreviation)) {
        errors.push('略称は半角アルファベット2～5文字で入力してください');
      }
    }

    // 筆頭幹事
    if (!formData.leadSecretary.name) {
      errors.push('筆頭幹事の氏名が入力されていません');
    }
    if (!formData.leadSecretary.affiliation) {
      errors.push('筆頭幹事の所属が入力されていません');
    }
    if (!formData.leadSecretary.email) {
      errors.push('筆頭幹事のメールアドレスが入力されていません');
    } else {
      // メールアドレス形式チェック
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.leadSecretary.email)) {
        errors.push('筆頭幹事のメールアドレスの形式が正しくありません');
      }
    }

    // 提案者（筆頭幹事以外）
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    formData.proposers.forEach((proposer, index) => {
      const label = proposer.name ? `${proposer.role}（${proposer.name}）` : `${proposer.role}（${index + 1}人目）`;
      if (!proposer.name) {
        errors.push(`${label}の氏名が入力されていません`);
      }
      if (!proposer.affiliation) {
        errors.push(`${label}の所属が入力されていません`);
      }
      if (proposer.role === '幹事') {
        if (!proposer.email) {
          errors.push(`${label}のメールアドレスが入力されていません`);
        } else if (!emailPattern.test(proposer.email)) {
          errors.push(`${label}のメールアドレスの形式が正しくありません`);
        }
      }
      // メンバーでもメールアドレスが入力されている場合は形式チェック
      if (proposer.role === 'メンバー' && proposer.email && !emailPattern.test(proposer.email)) {
        errors.push(`${label}のメールアドレスの形式が正しくありません`);
      }
    });

    // 研究テーマの概要
    if (!formData.overview || formData.overview.trim().length === 0) {
      errors.push('研究テーマの概要が入力されていません');
    }

    // 学術的問い
    const validQuestions = formData.questions.filter(q => q.trim().length > 0);
    if (validQuestions.length === 0) {
      errors.push('学術的「問い」が1つも入力されていません');
    }

    // 期待される効果
    if (!formData.expectedEffects || formData.expectedEffects.trim().length === 0) {
      errors.push('期待される効果が入力されていません');
    }

    // 第一種SIG希望
    if (!formData.firstClassPromotion) {
      errors.push('第一種SIGとして活動することを希望するか選択してください');
    }

    // 企画セッション
    const hasSelectedSession = Object.values(formData.plannedSessions).some(v => v);
    if (!hasSelectedSession) {
      errors.push('企画セッションが1つも選択されていません');
    }

    // 第一種SIG希望の場合の追加検証
    if (formData.firstClassPromotion === '希望する') {
      // 全国大会が選択されているかチェック
      if (!formData.plannedSessions.national) {
        errors.push('第一種SIG希望の場合、全国大会における企画セッションの実施が必要です');
      }

      // 研究会が2回以上選択されているかチェック
      const researchMeetingCount = [
        formData.plannedSessions.spring,
        formData.plannedSessions.summer,
        formData.plannedSessions.autumn,
        formData.plannedSessions.winter,
        formData.plannedSessions.special
      ].filter(Boolean).length;

      if (researchMeetingCount < 2) {
        errors.push('第一種SIG希望の場合、研究会における企画セッションを2回以上実施する必要があります');
      }
    }

    // 企画セッション詳細（選択している場合）
    if (hasSelectedSession) {
      if (!formData.sessionDetails.target) {
        errors.push('企画セッション詳細：実施する研究会/大会が選択されていません');
      }
      // 全国大会が選択されている場合、全国大会を詳細で選択しているかチェック
      if (formData.plannedSessions.national) {
        if (formData.sessionDetails.target !== '全国大会（2026年9月12～14日）') {
          errors.push('全国大会の企画セッションを予定している場合は、企画セッション詳細では全国大会について記載してください');
        }
      }
      if (!formData.sessionDetails.name) {
        errors.push('企画セッション詳細：セッション名が入力されていません');
      }
      if (!formData.sessionDetails.overview || formData.sessionDetails.overview.trim().length === 0) {
        errors.push('企画セッション詳細：セッションの概要が入力されていません');
      }
      if (!formData.sessionDetails.keywords) {
        errors.push('企画セッション詳細：キーワードが入力されていません');
      }
      if (!formData.sessionDetails.presenters) {
        errors.push('企画セッション詳細：発表者リストが入力されていません');
      }
    }

    // スケジュール
    const validSchedule = formData.schedule.filter(s => s.month && s.activities);
    if (validSchedule.length === 0) {
      errors.push('年間活動スケジュールが1つも入力されていません');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // PDF出力（ブラウザの印刷機能を使用）
  const exportPDF = () => {
    // まず検証
    if (!validateData()) {
      alert('入力に不備があります。エラーを確認してください。');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 検証成功したらエラー表示をクリア
    setValidationErrors([]);

    // 少し待ってから印刷ダイアログを開く（状態更新を反映させるため）
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const sessionOptions = [
    { key: 'spring', label: '春季研究会（2026年5月頃予定）' },
    { key: 'summer', label: '夏季研究会（2026年7月頃予定）' },
    { key: 'national', label: '全国大会（2026年9月12～14日）' },
    { key: 'autumn', label: '秋季研究会（2026年11月頃予定）' },
    { key: 'winter', label: '冬季研究会（2027年1月頃予定）' },
    { key: 'special', label: '特別研究会（2027年3月頃予定）' }
  ];

  const getCharCountClass = (current, max) => {
    if (current > max) return 'char-count warning';
    return 'char-count';
  };

  // 月ごとの活動内容プレースホルダー
  const getActivityPlaceholder = (month) => {
    const placeholders = {
      '4月': '例：キックオフミーティング（オンライン），運営委員会',
      '5月': '例：春季研究会にて企画セッション実施',
      '6月': '例：運営委員会，研究テーマの検討',
      '7月': '例：夏季研究会にて企画セッション実施',
      '9月': '例：全国大会にて企画セッション実施',
      '11月': '例：秋季研究会にて企画セッション実施',
      '12月': '例：運営委員会，年度活動の振り返り',
      '1月': '例：冬季研究会にて企画セッション実施',
      '3月': '例：特別研究会にて企画セッション実施，年度末総括'
    };
    return placeholders[month] || '例：活動内容を入力してください';
  };

  return (
    <div className="app">
      <div className="header">
        <h1>教育システム情報学会 第二種SIG提案書</h1>
        <p>入力フォーム</p>
      </div>

      {/* 検証エラー表示 */}
      {validationErrors.length > 0 && (
        <div style={{
          background: '#fee',
          border: '2px solid #c33',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#c33', marginBottom: '15px', fontSize: '16px' }}>
            入力エラー ({validationErrors.length}件)
          </h3>
          <ul style={{ marginLeft: '20px', color: '#c33' }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>{error}</li>
            ))}
          </ul>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setValidationErrors([])}
            style={{ marginTop: '15px' }}
          >
            エラー表示を閉じる
          </button>
        </div>
      )}

      <div className="form-container">
        {/* 提案日 */}
        <div className="section">
          <div className="form-group">
            <label>提案日</label>
            <input
              type="date"
              value={formData.submissionDate}
              onChange={(e) => handleInputChange('submissionDate', e.target.value)}
            />
          </div>
        </div>

        {/* 1. SIGの名称 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">1</span>
            SIGの名称
          </h2>
          <div className="form-group">
            <label>正式名称（和）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>SIG-</span>
              <input
                type="text"
                value={formData.sigNameJa}
                onChange={(e) => handleInputChange('sigNameJa', e.target.value)}
                placeholder="教育システム情報学"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>正式名称（英）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>SIG-</span>
              <input
                type="text"
                value={formData.sigNameEn}
                onChange={(e) => handleInputChange('sigNameEn', e.target.value)}
                placeholder="Information and Systems in Education"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>略称</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>SIG-</span>
              <input
                type="text"
                value={formData.sigAbbreviation}
                onChange={(e) => {
                  // アルファベットのみを許可
                  const value = e.target.value.replace(/[^A-Za-z]/g, '');
                  handleInputChange('sigAbbreviation', value);
                }}
                placeholder="EISE"
                maxLength="5"
                pattern="[A-Za-z]{2,5}"
                title="半角アルファベット2～5文字で入力してください"
                style={{ flex: 1 }}
              />
            </div>
            <div className="note">略称は半角アルファベット2～5文字で設定してください</div>
          </div>
        </div>

        {/* 2. 提案者 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">2</span>
            提案者
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{width: '100px'}}>役割</th>
                  <th>氏名</th>
                  <th>所属</th>
                  <th>メールアドレス</th>
                  <th style={{width: '80px'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {/* 筆頭幹事（固定） */}
                <tr>
                  <td>
                    <strong>筆頭幹事</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formData.leadSecretary.name}
                      onChange={(e) => updateLeadSecretary('name', e.target.value)}
                      placeholder="山田太郎"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formData.leadSecretary.affiliation}
                      onChange={(e) => updateLeadSecretary('affiliation', e.target.value)}
                      placeholder="〇〇大学"
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      value={formData.leadSecretary.email}
                      onChange={(e) => updateLeadSecretary('email', e.target.value)}
                      placeholder="example@university.ac.jp"
                      title="正しいメールアドレス形式で入力してください"
                    />
                  </td>
                  <td>
                    <span style={{fontSize: '12px', color: '#999'}}>固定</span>
                  </td>
                </tr>
                {/* 幹事・メンバー */}
                {formData.proposers.map((proposer, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={proposer.role}
                        onChange={(e) => updateProposer(index, 'role', e.target.value)}
                      >
                        <option value="幹事">幹事</option>
                        <option value="メンバー">メンバー</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposer.name}
                        onChange={(e) => updateProposer(index, 'name', e.target.value)}
                        placeholder="佐藤花子"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposer.affiliation}
                        onChange={(e) => updateProposer(index, 'affiliation', e.target.value)}
                        placeholder="△△大学"
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={proposer.email}
                        onChange={(e) => updateProposer(index, 'email', e.target.value)}
                        placeholder="example@university.ac.jp"
                        title="正しいメールアドレス形式で入力してください"
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => removeProposer(index)}
                        disabled={formData.proposers.length <= 2}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary btn-small" onClick={addProposer}>
            + 提案者を追加
          </button>
          <div className="note">
            筆頭幹事1名と幹事・メンバー2名以上（合計3名以上）が必要です。メールアドレスは、筆頭幹事および幹事のみで構いません。
          </div>
        </div>

        {/* 3. 研究テーマの概要 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">3</span>
            本SIGにおける研究テーマの概要
          </h2>
          <div className="form-group">
            <label>研究テーマの概要（学術的・社会的課題などの背景を含む）</label>
            <textarea
              value={formData.overview}
              onChange={(e) => handleInputChange('overview', e.target.value)}
              placeholder="学術的・社会的課題などの背景を含めて、研究テーマの概要を500文字程度で記述してください"
              style={{ minHeight: '200px' }}
            />
            <div className={getCharCountClass(formData.overview.length, 550)}>
              {formData.overview.length} / 500文字程度
            </div>
          </div>
        </div>

        {/* 4. 学術的「問い」 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">4</span>
            本SIGテーマのもとで共有したい学術的「問い」の例
          </h2>
          {formData.questions.map((question, index) => (
            <div key={index} className="form-group">
              <label>問い {index + 1}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder="例：教育システムの設計において考慮すべき主要な要因は何か？"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => removeQuestion(index)}
                  disabled={formData.questions.length === 1}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
          <button className="btn btn-primary btn-small" onClick={addQuestion}>
            + 問いを追加
          </button>
          <div className="note">5～10個程度、箇条書きで記載してください</div>
        </div>

        {/* 5. 期待される効果 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">5</span>
            本SIGの活動によって、本学会において期待される効果
          </h2>
          <div className="form-group">
            <textarea
              value={formData.expectedEffects}
              onChange={(e) => handleInputChange('expectedEffects', e.target.value)}
              placeholder="本SIGの活動が本学会にもたらす学術的・実践的な貢献や効果について、500文字程度で記述してください"
              style={{ minHeight: '200px' }}
            />
            <div className={getCharCountClass(formData.expectedEffects.length, 550)}>
              {formData.expectedEffects.length} / 500文字程度
            </div>
          </div>
        </div>

        {/* 6. 第一種SIG希望 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">6</span>
            今回提案する2026年度の次の年度（2027年度）から第一種SIGとして活動することを希望しますか？
          </h2>
          <div className="note" style={{ marginBottom: '15px' }}>
            ※希望する場合は、2026年度内に、全国大会における企画セッションを企画・実施し、かつ研究会における企画セッションを2回以上企画・実施する必要があります。
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', background: formData.firstClassPromotion === '希望する' ? '#e3f2fd' : '#f8f9fa', borderRadius: '4px', border: formData.firstClassPromotion === '希望する' ? '2px solid #2196f3' : '1px solid #ddd' }}>
                <input
                  type="radio"
                  name="firstClassPromotion"
                  value="希望する"
                  checked={formData.firstClassPromotion === '希望する'}
                  onChange={(e) => handleInputChange('firstClassPromotion', e.target.value)}
                  style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: formData.firstClassPromotion === '希望する' ? 'bold' : 'normal' }}>
                  希望する、もしくは希望する可能性がある
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', background: formData.firstClassPromotion === '希望しない' ? '#e3f2fd' : '#f8f9fa', borderRadius: '4px', border: formData.firstClassPromotion === '希望しない' ? '2px solid #2196f3' : '1px solid #ddd' }}>
                <input
                  type="radio"
                  name="firstClassPromotion"
                  value="希望しない"
                  checked={formData.firstClassPromotion === '希望しない'}
                  onChange={(e) => handleInputChange('firstClassPromotion', e.target.value)}
                  style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: formData.firstClassPromotion === '希望しない' ? 'bold' : 'normal' }}>
                  希望することはない
                </span>
              </label>
            </div>
          </div>
          {formData.firstClassPromotion === '希望する' && (
            <div className="note" style={{ marginTop: '15px', background: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
              ※第一種SIG希望の場合は、以下（7）の企画セッション実施予定において、全国大会を含め、かつ研究会を2回以上選択してください。
            </div>
          )}
        </div>

        {/* 7. 企画セッション実施予定 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">7</span>
            企画セッションをどの大会・研究会で企画・実施予定か
          </h2>
          <div className="note" style={{ marginBottom: '15px' }}>
            現時点の想定を回答してください。複数回予定している場合はすべて選択してください。
            ※研究会は2026年度から全5回の開催となります。開催月は現時点の見込みであり、今後変更になる可能性があります。
          </div>
          <div className="checkbox-group">
            {sessionOptions.map(option => (
              <div key={option.key} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`session-${option.key}`}
                  checked={formData.plannedSessions[option.key]}
                  onChange={() => handleSessionCheckbox(option.key)}
                />
                <label htmlFor={`session-${option.key}`}>{option.label}</label>
              </div>
            ))}
          </div>

          {/* 企画セッション詳細 */}
          {Object.values(formData.plannedSessions).some(v => v) && (
            <div className="session-details">
              <h4>選択した企画セッションのうち1回について詳細を記載してください</h4>
              <div className="note" style={{ marginBottom: '15px' }}>
                全国大会の企画セッションを予定している場合は、それについて記載してください。
                全国大会の企画セッションを予定していない場合は、任意の研究会の企画について記載してください。
              </div>

              <div className="form-group">
                <label>どの研究会/大会で実施するか</label>
                <select
                  value={formData.sessionDetails.target}
                  onChange={(e) => handleNestedInputChange('sessionDetails', 'target', e.target.value)}
                >
                  <option value="">選択してください</option>
                  {sessionOptions.map(option => (
                    formData.plannedSessions[option.key] && (
                      <option key={option.key} value={option.label}>{option.label}</option>
                    )
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>セッション名（案）</label>
                <input
                  type="text"
                  value={formData.sessionDetails.name}
                  onChange={(e) => handleNestedInputChange('sessionDetails', 'name', e.target.value)}
                  placeholder="例：教育システム情報学の展望と課題"
                />
              </div>

              <div className="form-group">
                <label>セッションの概要（400字程度）</label>
                <textarea
                  value={formData.sessionDetails.overview}
                  onChange={(e) => handleNestedInputChange('sessionDetails', 'overview', e.target.value)}
                  placeholder="企画セッションのテーマ、目的、期待される議論の内容などについて、400字程度で記述してください"
                  style={{ minHeight: '150px' }}
                />
                <div className={getCharCountClass(formData.sessionDetails.overview.length, 450)}>
                  {formData.sessionDetails.overview.length} / 400文字程度
                </div>
              </div>

              <div className="form-group">
                <label>キーワード（5個程度）</label>
                <input
                  type="text"
                  value={formData.sessionDetails.keywords}
                  onChange={(e) => handleNestedInputChange('sessionDetails', 'keywords', e.target.value)}
                  placeholder="例：キーワード1，キーワード2，キーワード3（カンマ区切りで5個程度）"
                />
              </div>

              <div className="form-group">
                <label>発表者リスト（3名以上）</label>
                <textarea
                  value={formData.sessionDetails.presenters}
                  onChange={(e) => handleNestedInputChange('sessionDetails', 'presenters', e.target.value)}
                  placeholder="氏名1（所属機関1），氏名2（所属機関2），氏名3（所属機関3）"
                  style={{ minHeight: '80px' }}
                />
                <div className="note">提案時点の見込みで構いません</div>
              </div>
            </div>
          )}
        </div>

        {/* 8. 年間活動スケジュール */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">8</span>
            年間活動スケジュール（4月～翌3月）
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{width: '100px'}}>月</th>
                  <th>活動内容</th>
                  <th style={{width: '80px'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {formData.schedule.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={item.month}
                        onChange={(e) => updateSchedule(index, 'month', e.target.value)}
                        placeholder="4月"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.activities}
                        onChange={(e) => updateSchedule(index, 'activities', e.target.value)}
                        placeholder={getActivityPlaceholder(item.month)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => removeSchedule(index)}
                        disabled={formData.schedule.length === 1}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary btn-small" onClick={addScheduleItem}>
            + スケジュールを追加
          </button>
        </div>

        {/* 操作ボタン */}
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={() => {
              if (validateData()) {
                alert('✓ すべての必須項目が入力されています！');
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            style={{ fontSize: '15px', fontWeight: 'bold' }}
          >
            入力チェック
          </button>
          <button
            className="btn btn-success"
            onClick={exportPDF}
            style={{ fontSize: '15px', fontWeight: 'bold' }}
          >
            PDFで出力
          </button>
          <button className="btn btn-success" onClick={exportData}>
            JSONでエクスポート
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            JSONからインポート
            <input
              type="file"
              accept=".json"
              onChange={importData}
              style={{ display: 'none' }}
            />
          </label>
          <button className="btn btn-secondary" onClick={clearData}>
            データをクリア
          </button>
        </div>
      </div>

      {/* 印刷用コンテンツ（通常時は非表示） */}
      <div className="print-only" style={{ display: 'none', padding: '20mm', fontFamily: 'serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '18pt', marginBottom: '10px' }}>教育システム情報学会 第二種SIG提案書</h1>
          <p style={{ textAlign: 'right', marginTop: '20px' }}>提案日：{formData.submissionDate}</p>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>1　SIGの名称</h2>
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #333', padding: '8px', width: '30%', background: '#f0f0f0' }}>正式名称（和）</td>
                <td style={{ border: '1px solid #333', padding: '8px' }}>SIG-{formData.sigNameJa}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #333', padding: '8px', background: '#f0f0f0' }}>正式名称（英）</td>
                <td style={{ border: '1px solid #333', padding: '8px' }}>SIG-{formData.sigNameEn}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #333', padding: '8px', background: '#f0f0f0' }}>略称</td>
                <td style={{ border: '1px solid #333', padding: '8px' }}>SIG-{formData.sigAbbreviation}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '9pt', color: '#666' }}>（注）正式名称はできる限り簡潔にしてください。また、略称はアルファベット2～5文字で設定してください。</p>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>2　提案者</h2>
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #333', padding: '8px', width: '15%' }}>役割</th>
                <th style={{ border: '1px solid #333', padding: '8px', width: '20%' }}>氏名</th>
                <th style={{ border: '1px solid #333', padding: '8px', width: '35%' }}>所属</th>
                <th style={{ border: '1px solid #333', padding: '8px' }}>メールアドレス</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #333', padding: '8px' }}>筆頭幹事</td>
                <td style={{ border: '1px solid #333', padding: '8px' }}>{formData.leadSecretary.name}</td>
                <td style={{ border: '1px solid #333', padding: '8px' }}>{formData.leadSecretary.affiliation}</td>
                <td style={{ border: '1px solid #333', padding: '8px', fontSize: '9pt' }}>{formData.leadSecretary.email}</td>
              </tr>
              {formData.proposers.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #333', padding: '8px' }}>{p.role}</td>
                  <td style={{ border: '1px solid #333', padding: '8px' }}>{p.name}</td>
                  <td style={{ border: '1px solid #333', padding: '8px' }}>{p.affiliation}</td>
                  <td style={{ border: '1px solid #333', padding: '8px', fontSize: '9pt' }}>{p.email || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '9pt', color: '#666' }}>（注）メンバーが複数いる場合は、適宜行を追加してください。メールアドレスは、筆頭幹事および幹事のみで構いません。</p>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>3　本SIGにおける研究テーマの概要</h2>
          <p style={{ textAlign: 'justify', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{formData.overview}</p>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>4　本SIGテーマのもとで共有したい学術的「問い」の例</h2>
          <ul style={{ marginLeft: '20px' }}>
            {formData.questions.filter(q => q.trim()).map((q, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>{q}</li>
            ))}
          </ul>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>5　本SIGの活動によって、本学会において期待される効果</h2>
          <p style={{ textAlign: 'justify', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{formData.expectedEffects}</p>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>6　今回提案する2026年度の次の年度（2027年度）から第一種SIGとして活動することを希望しますか？</h2>
          <p style={{ marginBottom: '10px', fontSize: '10pt', color: '#666' }}>
            ※希望する場合は、2026年度内に、全国大会における企画セッションを企画・実施し、かつ研究会における企画セッションを2回以上企画・実施する必要があります。
          </p>
          <p style={{ fontWeight: 'bold', marginTop: '10px' }}>
            回答: {formData.firstClassPromotion || '（未選択）'}
          </p>
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>7　企画セッション実施予定</h2>
          <p style={{ marginBottom: '10px' }}>
            {[
              formData.plannedSessions.spring && '春季研究会（2026年5月頃予定）',
              formData.plannedSessions.summer && '夏季研究会（2026年7月頃予定）',
              formData.plannedSessions.national && '全国大会（2026年9月12～14日）',
              formData.plannedSessions.autumn && '秋季研究会（2026年11月頃予定）',
              formData.plannedSessions.winter && '冬季研究会（2027年1月頃予定）',
              formData.plannedSessions.special && '特別研究会（2027年3月頃予定）'
            ].filter(Boolean).join('、')}
          </p>
          {formData.sessionDetails.target && (
            <div style={{ background: '#f9f9f9', padding: '15px', border: '1px solid #ddd', marginTop: '10px' }}>
              <h3 style={{ fontSize: '12pt', marginBottom: '10px' }}>企画セッション詳細</h3>
              <p><strong>実施:</strong> {formData.sessionDetails.target}</p>
              <p><strong>セッション名:</strong> {formData.sessionDetails.name}</p>
              <p style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }}><strong>概要:</strong> {formData.sessionDetails.overview}</p>
              <p><strong>キーワード:</strong> {formData.sessionDetails.keywords}</p>
              <p><strong>発表者:</strong> {formData.sessionDetails.presenters}</p>
            </div>
          )}
        </div>

        <div className="print-section">
          <h2 style={{ fontSize: '14pt', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '10px' }}>8　年間活動スケジュール（4月～翌3月）</h2>
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {formData.schedule.filter(s => s.month && s.activities).map((s, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #333', padding: '8px', width: '15%', background: '#f0f0f0' }}>{s.month}</td>
                  <td style={{ border: '1px solid #333', padding: '8px' }}>{s.activities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: 'right', marginTop: '40px' }}>以上</p>
      </div>
    </div>
  );
};

export default App;
