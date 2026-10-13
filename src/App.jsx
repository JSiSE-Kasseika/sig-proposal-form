import React, { useState, useEffect } from "react";

// 提案・計画の対象年度
const FISCAL_YEAR = 2027;

const SESSION_OPTIONS = [
  { key: "spring", label: `春季研究会（${FISCAL_YEAR}年5月頃予定）` },
  { key: "summer", label: `夏季研究会（${FISCAL_YEAR}年7月頃予定）` },
  { key: "national", label: `全国大会（${FISCAL_YEAR}年8月28～30日）` },
  { key: "autumn", label: `秋季研究会（${FISCAL_YEAR}年11月頃予定）` },
  { key: "winter", label: `冬季研究会（${FISCAL_YEAR + 1}年1月頃予定）` },
  { key: "special", label: `特別研究会（${FISCAL_YEAR + 1}年3月頃予定）` },
];

const getSessionLabel = (key) => SESSION_OPTIONS.find((o) => o.key === key)?.label || "";

// 継続の対象となる既存SIG
const EXISTING_SIGS = [
  { abbreviation: "AID", nameJa: "アカデミックインテグリティと学習デザイン" },
  { abbreviation: "DEPR", nameJa: "教育実践研究のデザイン" },
  { abbreviation: "DTCI", nameJa: "地域課題探究DX" },
  { abbreviation: "ERS", nameJa: "防災・安全教育" },
  { abbreviation: "RBL", nameJa: "再構成学習" },
  { abbreviation: "PS", nameJa: "心理的安全性" },
  { abbreviation: "SLAM", nameJa: "認知スキーマ・学習活動モデリング" },
];

// 予算案の費目
const BUDGET_CATEGORIES = [
  {
    key: "meeting",
    label: "会議費",
    example: "会場利用料、貸会議室利用料など",
    rationaleExample: "例：公開ワークショップの会場利用料（半日×1回）",
  },
  {
    key: "honorarium",
    label: "謝金",
    example: "講師への謝金など（交通費・宿泊費を含む）※JSiSE会員への謝金支払いは不可",
    rationaleExample: "例：招待講演の講師謝金（非会員1名、交通費を含む）",
  },
  {
    key: "travel",
    label: "旅費交通費",
    example: "調査のための交通費・宿泊費（日当はなし）※全国大会や研究会への旅費交通費は不可",
    rationaleExample: "例：先進事例の訪問調査の交通費・宿泊費（2名×1回）",
  },
  {
    key: "communication",
    label: "通信運搬費",
    example: "郵送料など",
    rationaleExample: "例：ワークショップ資料・機材の郵送料（2回分）",
  },
  {
    key: "supplies",
    label: "消耗品費",
    example: "消耗品",
    rationaleExample: "例：ワークショップ用の付箋・模造紙・印刷用紙",
  },
  {
    key: "misc",
    label: "雑費",
    example: "上の費目に含まれないもの",
    rationaleExample: "例：謝金の振込手数料",
  },
];

// 予算総額の上限（千円）
const BUDGET_LIMIT = 200;

const initialFormData = {
  applicationType: "", // 'new'（新規申請） or 'continuation'（継続SIGの次年度活動計画）
  submissionDate: "",
  sigNameJa: "",
  sigNameEn: "",
  sigAbbreviation: "",
  leadSecretary: { name: "", affiliation: "", email: "", memberId: "" },
  proposers: [
    { role: "幹事", name: "", affiliation: "", email: "", memberId: "" },
    { role: "幹事", name: "", affiliation: "", email: "", memberId: "" },
  ],
  overview: "",
  questions: [""],
  expectedEffects: "",
  firstClassPromotion: "", // '希望する' or '希望しない'（対象年度の次の年度の第一種希望）
  nextYearClass: "", // '第一種' or '第二種'（継続のみ。対象年度の種別）
  plannedSessions: {
    spring: false,
    summer: false,
    national: false,
    autumn: false,
    winter: false,
    special: false,
  },
  sessionDetails: {
    target: "", // SESSION_OPTIONSのkey
    name: "",
    overview: "",
    keywords: "",
    presenters: "",
    organizers: "", // 全国大会選択時のみ使用
  },
  schedule: [
    { month: "4月", activities: "" },
    { month: "6月", activities: "" },
    { month: "8月", activities: "" },
    { month: "12月", activities: "" },
    { month: "3月", activities: "" },
  ],
  // 予算案（継続かつ第一種のみ）。金額は千円単位
  budget: Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, { amount: "", rationale: "" }])),
};

// 保存・インポートされたデータを現在の形式に揃える（旧形式のデータにも対応）
const normalizeFormData = (data) => {
  const merged = {
    ...initialFormData,
    ...data,
    leadSecretary: { ...initialFormData.leadSecretary, ...data.leadSecretary },
    plannedSessions: { ...initialFormData.plannedSessions, ...data.plannedSessions },
    sessionDetails: { ...initialFormData.sessionDetails, ...data.sessionDetails },
    budget: Object.fromEntries(
      BUDGET_CATEGORIES.map((c) => [
        c.key,
        { ...initialFormData.budget[c.key], ...(data.budget || {})[c.key] },
      ]),
    ),
  };

  // 旧形式では役割「メンバー」だったものを「運営委員」に読み替える
  merged.proposers = merged.proposers.map((p) => ({
    ...p,
    role: p.role === "メンバー" ? "運営委員" : p.role,
  }));

  // 実施する研究会/大会がラベルで保存されている場合はkeyに読み替える
  const target = merged.sessionDetails.target;
  if (target && !SESSION_OPTIONS.some((o) => o.key === target)) {
    const name = target.split("（")[0];
    const option = SESSION_OPTIONS.find((o) => o.label.startsWith(name));
    merged.sessionDetails.target = option ? option.key : "";
  }

  // エクスポート時に付与したセッション名のプレフィックスを取り除く
  const prefix = `SIG-${merged.sigAbbreviation}：`;
  if (merged.sessionDetails.name.startsWith(prefix)) {
    merged.sessionDetails.name = merged.sessionDetails.name.slice(prefix.length);
  }

  return merged;
};

const App = () => {
  const [validationErrors, setValidationErrors] = useState([]);
  const [formData, setFormData] = useState(initialFormData);

  const isContinuation = formData.applicationType === "continuation";
  const selectedSig = EXISTING_SIGS.find((sig) => sig.abbreviation === formData.sigAbbreviation);
  const isFirstClassPlan = isContinuation && formData.nextYearClass === "第一種";
  const documentTitle = isContinuation
    ? `教育システム情報学会 SIG ${FISCAL_YEAR}年度活動計画書`
    : "教育システム情報学会 第二種SIG提案書";
  const dateLabel = isContinuation ? "提出日" : "提案日";
  const sectionNo = isContinuation
    ? { name: 1, submitter: 2, sigClass: 3, sessions: 4, schedule: 5, budget: 6 }
    : {
        name: 1,
        proposers: 2,
        overview: 3,
        questions: 4,
        effects: 5,
        sigClass: 6,
        sessions: 7,
        schedule: 8,
      };

  // 予算総額（千円）
  const budgetTotal = BUDGET_CATEGORIES.reduce(
    (sum, c) => sum + (parseInt(formData.budget[c.key].amount, 10) || 0),
    0,
  );

  // 全国大会1回＋研究会2回以上（第一種SIGの条件）を満たす計画かどうか
  const researchMeetingCount = ["spring", "summer", "autumn", "winter", "special"].filter(
    (key) => formData.plannedSessions[key],
  ).length;

  // ローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem("sigProposalData");
    if (saved) {
      try {
        setFormData(normalizeFormData(JSON.parse(saved)));
      } catch (e) {
        console.error("データの読み込みに失敗しました", e);
      }
    }
  }, []);

  // ローカルストレージに自動保存
  useEffect(() => {
    localStorage.setItem("sigProposalData", JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  // 筆頭幹事管理
  const updateLeadSecretary = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      leadSecretary: { ...prev.leadSecretary, [field]: value },
    }));
  };

  // 提案者管理
  const addProposer = () => {
    setFormData((prev) => ({
      ...prev,
      proposers: [
        ...prev.proposers,
        { role: "運営委員", name: "", affiliation: "", email: "", memberId: "" },
      ],
    }));
  };

  const updateProposer = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      proposers: prev.proposers.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const removeProposer = (index) => {
    // 最低2名（筆頭幹事以外）は必要
    if (formData.proposers.length > 2) {
      setFormData((prev) => ({
        ...prev,
        proposers: prev.proposers.filter((_, i) => i !== index),
      }));
    }
  };

  // 学術的問い管理
  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, ""],
    }));
  };

  const updateQuestion = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? value : q)),
    }));
  };

  const removeQuestion = (index) => {
    if (formData.questions.length > 1) {
      setFormData((prev) => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index),
      }));
    }
  };

  // スケジュール管理
  const addScheduleItem = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { month: "", activities: "" }],
    }));
  };

  const updateSchedule = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const removeSchedule = (index) => {
    if (formData.schedule.length > 1) {
      setFormData((prev) => ({
        ...prev,
        schedule: prev.schedule.filter((_, i) => i !== index),
      }));
    }
  };

  // 企画セッション選択管理
  const handleSessionCheckbox = (sessionKey) => {
    setFormData((prev) => ({
      ...prev,
      plannedSessions: {
        ...prev.plannedSessions,
        [sessionKey]: !prev.plannedSessions[sessionKey],
      },
    }));
  };

  // 予算案管理（金額は半角数字のみ）
  const updateBudget = (key, field, value) => {
    setFormData((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        [key]: {
          ...prev.budget[key],
          [field]: field === "amount" ? value.replace(/[^0-9]/g, "") : value,
        },
      },
    }));
  };

  // JSONエクスポート
  const exportData = () => {
    // エクスポート用にセッション名にプレフィックスを付け、実施する研究会/大会をラベルにしたデータを作成
    const exportFormData = {
      ...formData,
      sessionDetails: {
        ...formData.sessionDetails,
        target: getSessionLabel(formData.sessionDetails.target),
        name: formData.sessionDetails.name
          ? `SIG-${formData.sigAbbreviation}：${formData.sessionDetails.name}`
          : "",
      },
    };
    // 申請種別で使用しない項目は出力しない
    if (isContinuation) {
      ["sigNameEn", "proposers", "overview", "questions", "expectedEffects"].forEach(
        (field) => delete exportFormData[field],
      );
      exportFormData.leadSecretary = {
        name: formData.leadSecretary.name,
        email: formData.leadSecretary.email,
      };
      if (isFirstClassPlan) {
        exportFormData.budgetTotal = budgetTotal;
      } else {
        delete exportFormData.budget;
      }
    } else {
      delete exportFormData.nextYearClass;
      delete exportFormData.budget;
    }
    const dataStr = JSON.stringify(exportFormData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `sig-${isContinuation ? "plan" : "proposal"}-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
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
          setFormData(normalizeFormData(imported));
          alert("データを読み込みました");
        } catch (error) {
          alert("ファイルの読み込みに失敗しました");
        }
      };
      reader.readAsText(file);
    }
  };

  // データクリア
  const clearData = () => {
    if (window.confirm("すべてのデータをクリアしてもよろしいですか？")) {
      localStorage.removeItem("sigProposalData");
      window.location.reload();
    }
  };

  // データ検証
  const validateData = () => {
    const errors = [];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 提案日・提出日
    if (!formData.submissionDate) {
      errors.push(`${dateLabel}が入力されていません`);
    }

    // SIG名称（継続は既存SIGから選択）
    if (isContinuation) {
      if (!selectedSig) {
        errors.push("SIGが選択されていません");
      }
    } else if (!formData.sigNameJa) {
      errors.push("正式名称（和）が入力されていません");
    }
    if (!isContinuation && !formData.sigNameEn) {
      errors.push("正式名称（英）が入力されていません");
    }
    if (isContinuation) {
      // 略称は選択したSIGで決まる
    } else if (!formData.sigAbbreviation) {
      errors.push("略称が入力されていません");
    } else {
      // 略称は半角アルファベット2～5文字
      const abbrevPattern = /^[A-Za-z]{2,5}$/;
      if (!abbrevPattern.test(formData.sigAbbreviation)) {
        errors.push("略称は半角アルファベット2～5文字で入力してください");
      }
    }

    // 筆頭幹事
    if (!formData.leadSecretary.name) {
      errors.push("筆頭幹事の氏名が入力されていません");
    }
    if (!isContinuation) {
      if (!formData.leadSecretary.memberId) {
        errors.push("筆頭幹事の会員番号が入力されていません");
      }
      if (!formData.leadSecretary.affiliation) {
        errors.push("筆頭幹事の所属が入力されていません");
      }
    }
    if (!formData.leadSecretary.email) {
      errors.push("筆頭幹事のメールアドレスが入力されていません");
    } else if (!emailPattern.test(formData.leadSecretary.email)) {
      errors.push("筆頭幹事のメールアドレスの形式が正しくありません");
    }

    if (isContinuation) {
      // 次年度の種別
      if (!formData.nextYearClass) {
        errors.push(`${FISCAL_YEAR}年度の種別（第一種／第二種）を選択してください`);
      }
      // 次々年度の第一種SIG希望
      if (!formData.firstClassPromotion) {
        errors.push(
          `${FISCAL_YEAR + 1}年度に第一種SIGとして活動することを希望するか選択してください`,
        );
      }
    } else {
      // 提案者（筆頭幹事以外）
      formData.proposers.forEach((proposer, index) => {
        const label = proposer.name
          ? `${proposer.role}（${proposer.name}）`
          : `${proposer.role}（${index + 1}人目）`;
        if (!proposer.name) {
          errors.push(`${label}の氏名が入力されていません`);
        }
        if (!proposer.memberId) {
          errors.push(`${label}の会員番号が入力されていません`);
        }
        if (!proposer.affiliation) {
          errors.push(`${label}の所属が入力されていません`);
        }
        if (proposer.role === "幹事") {
          if (!proposer.email) {
            errors.push(`${label}のメールアドレスが入力されていません`);
          } else if (!emailPattern.test(proposer.email)) {
            errors.push(`${label}のメールアドレスの形式が正しくありません`);
          }
        }
        // 運営委員でもメールアドレスが入力されている場合は形式チェック
        if (proposer.role === "運営委員" && proposer.email && !emailPattern.test(proposer.email)) {
          errors.push(`${label}のメールアドレスの形式が正しくありません`);
        }
      });

      // 幹事は1～3名
      const secretaryCount = formData.proposers.filter((p) => p.role === "幹事").length;
      if (secretaryCount < 1 || secretaryCount > 3) {
        errors.push("幹事は1名以上3名以下で設定してください（筆頭幹事を除く）");
      }

      // 研究テーマの概要
      if (!formData.overview || formData.overview.trim().length === 0) {
        errors.push("研究テーマの概要が入力されていません");
      }

      // 学術的問い
      const validQuestions = formData.questions.filter((q) => q.trim().length > 0);
      if (validQuestions.length === 0) {
        errors.push("学術的「問い」が1つも入力されていません");
      }

      // 期待される効果
      if (!formData.expectedEffects || formData.expectedEffects.trim().length === 0) {
        errors.push("期待される効果が入力されていません");
      }

      // 第一種SIG希望
      if (!formData.firstClassPromotion) {
        errors.push("第一種SIGとして活動することを希望するか選択してください");
      }
    }

    // 企画セッション
    const hasSelectedSession = Object.values(formData.plannedSessions).some((v) => v);
    if (!hasSelectedSession) {
      errors.push("企画セッションが1つも選択されていません");
    }

    // 第一種SIG希望の場合の追加検証
    if (formData.firstClassPromotion === "希望する") {
      // 全国大会が選択されているかチェック
      if (!formData.plannedSessions.national) {
        errors.push(
          `${FISCAL_YEAR + 1}年度の第一種SIG希望の場合、全国大会における企画セッションの実施が必要です`,
        );
      }

      // 研究会が2回以上選択されているかチェック
      if (researchMeetingCount < 2) {
        errors.push(
          `${FISCAL_YEAR + 1}年度の第一種SIG希望の場合、研究会における企画セッションを2回以上実施する必要があります`,
        );
      }
    }

    // 企画セッション詳細（選択している場合）
    if (hasSelectedSession) {
      if (!formData.sessionDetails.target) {
        errors.push("企画セッション詳細：実施する研究会/大会が選択されていません");
      } else if (!formData.plannedSessions[formData.sessionDetails.target]) {
        errors.push(
          "企画セッション詳細：実施予定として選択していない研究会/大会が指定されています",
        );
      } else if (formData.plannedSessions.national && formData.sessionDetails.target !== "national") {
        // 全国大会が選択されている場合、全国大会を詳細で選択しているかチェック
        errors.push(
          "全国大会の企画セッションを予定している場合は、企画セッション詳細では全国大会について記載してください",
        );
      }
      if (!formData.sessionDetails.name) {
        errors.push("企画セッション詳細：セッション名が入力されていません");
      }
      if (
        !formData.sessionDetails.overview ||
        formData.sessionDetails.overview.trim().length === 0
      ) {
        errors.push("企画セッション詳細：セッションの概要が入力されていません");
      }
      if (!formData.sessionDetails.keywords) {
        errors.push("企画セッション詳細：キーワードが入力されていません");
      }
      if (!formData.sessionDetails.presenters) {
        errors.push("企画セッション詳細：発表者リストが入力されていません");
      }
      // 全国大会を選択した場合、オーガナイザの入力をチェック
      if (formData.sessionDetails.target === "national" && !formData.sessionDetails.organizers) {
        errors.push("企画セッション詳細：全国大会を選択した場合はオーガナイザの入力が必要です");
      }
    }

    // スケジュール
    const validSchedule = formData.schedule.filter((s) => s.month && s.activities);
    if (validSchedule.length === 0) {
      errors.push("年間活動スケジュールが1つも入力されていません");
    }

    // 予算案（第一種・第一種見込みのみ）
    if (isFirstClassPlan) {
      BUDGET_CATEGORIES.forEach((c) => {
        const item = formData.budget[c.key];
        if ((parseInt(item.amount, 10) || 0) > 0 && !item.rationale.trim()) {
          errors.push(`予算案：${c.label}の予算の根拠が入力されていません`);
        }
      });
      if (budgetTotal > BUDGET_LIMIT) {
        errors.push(
          `予算案：予算総額が上限の${BUDGET_LIMIT / 10}万円（入力値で${BUDGET_LIMIT}）を超えています`,
        );
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // PDF出力（ブラウザの印刷機能を使用）
  const exportPDF = () => {
    // まず検証
    if (!validateData()) {
      alert("入力に不備があります。エラーを確認してください。");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 検証成功したらエラー表示をクリア
    setValidationErrors([]);

    // 少し待ってから印刷ダイアログを開く（状態更新を反映させるため）
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getCharCountClass = (current, max) => {
    if (current > max) return "char-count warning";
    return "char-count";
  };

  // 月ごとの活動内容プレースホルダー
  const getActivityPlaceholder = (month) => {
    const placeholders = {
      "4月": "例：キックオフミーティング（オンライン），運営委員会",
      "5月": "例：春季研究会にて企画セッション実施",
      "6月": "例：運営委員会，研究テーマの検討",
      "7月": "例：夏季研究会にて企画セッション実施",
      "8月": "例：全国大会にて企画セッション実施",
      "11月": "例：秋季研究会にて企画セッション実施",
      "12月": "例：運営委員会，年度活動の振り返り",
      "1月": "例：冬季研究会にて企画セッション実施",
      "3月": "例：特別研究会にて企画セッション実施，年度末総括",
    };
    return placeholders[month] || "例：活動内容を入力してください";
  };

  // ラジオボタンの選択肢
  const renderRadioOption = (field, value, text) => {
    const checked = formData[field] === value;
    return (
      <label
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          padding: "10px",
          background: checked ? "#e3f2fd" : "#f8f9fa",
          borderRadius: "4px",
          border: checked ? "2px solid #2196f3" : "1px solid #ddd",
        }}
      >
        <input
          type="radio"
          name={field}
          value={value}
          checked={checked}
          onChange={(e) => handleInputChange(field, e.target.value)}
          style={{ marginRight: "10px", width: "18px", height: "18px", cursor: "pointer" }}
        />
        <span style={{ fontWeight: checked ? "bold" : "normal" }}>{text}</span>
      </label>
    );
  };

  const printHeadingStyle = {
    fontSize: "14pt",
    borderBottom: "2px solid #333",
    paddingBottom: "5px",
    marginBottom: "10px",
  };

  return (
    <div className="app">
      <div className="header">
        <h1>
          {formData.applicationType ? documentTitle : "教育システム情報学会 SIG提案書・活動計画書"}
        </h1>
        <p>作成支援システム</p>
      </div>

      {/* 検証エラー表示 */}
      {validationErrors.length > 0 && (
        <div
          style={{
            background: "#fee",
            border: "2px solid #c33",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ color: "#c33", marginBottom: "15px", fontSize: "16px" }}>
            入力エラー ({validationErrors.length}件)
          </h3>
          <ul style={{ marginLeft: "20px", color: "#c33" }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ marginBottom: "8px" }}>
                {error}
              </li>
            ))}
          </ul>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setValidationErrors([])}
            style={{ marginTop: "15px" }}
          >
            エラー表示を閉じる
          </button>
        </div>
      )}

      {/* 申請種別の選択 */}
      {!formData.applicationType && (
        <div className="form-container">
          <div className="section">
            <h2 className="section-title">申請の種別を選択してください</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className="btn btn-primary"
                onClick={() => handleInputChange("applicationType", "new")}
              >
                新規申請（第二種SIGの提案）
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleInputChange("applicationType", "continuation")}
              >
                継続（既存SIGの{FISCAL_YEAR}年度活動計画）
              </button>
            </div>
            <div className="note" style={{ marginTop: "15px" }}>
              新たにSIGを立ち上げる場合は「新規申請」を、すでに活動しているSIG（第一種・第二種）が
              {FISCAL_YEAR}
              年度も活動を継続する場合は「継続」を選択してください。以前エクスポートしたJSONファイルは、種別を選択したあとに「JSONからインポート」で読み込めます。
            </div>
          </div>
        </div>
      )}

      {formData.applicationType && (
      <div className="form-container">
        {/* 申請種別 */}
        <div className="section">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div>
              <strong>申請種別：</strong>
              {isContinuation
                ? `継続（既存SIGの${FISCAL_YEAR}年度活動計画）`
                : "新規申請（第二種SIGの提案）"}
            </div>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => {
                setValidationErrors([]);
                handleInputChange("applicationType", "");
              }}
            >
              種別を選び直す
            </button>
          </div>
          {isContinuation && (
            <div className="note">
              継続そのものについての申請は不要です。{FISCAL_YEAR}
              年度の活動計画のみを記入してください。SIGの概要や幹事団・運営委員を改めて記入する必要はありません。
            </div>
          )}
        </div>

        {/* 提案日・提出日 */}
        <div className="section">
          <div className="form-group">
            <label>{dateLabel}</label>
            <input
              type="date"
              value={formData.submissionDate}
              onChange={(e) => handleInputChange("submissionDate", e.target.value)}
            />
          </div>
        </div>

        {/* 1. SIGの名称 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">{sectionNo.name}</span>
            SIGの名称
          </h2>
          {isContinuation ? (
            <div className="form-group">
              <label>活動計画を提出するSIG</label>
              <select
                value={selectedSig ? selectedSig.abbreviation : ""}
                onChange={(e) => {
                  const sig = EXISTING_SIGS.find((item) => item.abbreviation === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    sigAbbreviation: sig ? sig.abbreviation : "",
                    sigNameJa: sig ? sig.nameJa : "",
                  }));
                }}
              >
                <option value="">選択してください</option>
                {EXISTING_SIGS.map((sig) => (
                  <option key={sig.abbreviation} value={sig.abbreviation}>
                    SIG-{sig.abbreviation}：{sig.nameJa}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
          <div className="form-group">
            <label>正式名称（和）</label>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontWeight: "bold", fontSize: "14px", whiteSpace: "nowrap" }}>
                SIG-
              </span>
              <input
                type="text"
                value={formData.sigNameJa}
                onChange={(e) => handleInputChange("sigNameJa", e.target.value)}
                placeholder="教育システム情報学"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>正式名称（英）</label>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontWeight: "bold", fontSize: "14px", whiteSpace: "nowrap" }}>
                SIG-
              </span>
              <input
                type="text"
                value={formData.sigNameEn}
                onChange={(e) => handleInputChange("sigNameEn", e.target.value)}
                placeholder="Information and Systems in Education"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>略称</label>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontWeight: "bold", fontSize: "14px", whiteSpace: "nowrap" }}>
                SIG-
              </span>
              <input
                type="text"
                value={formData.sigAbbreviation}
                onChange={(e) => {
                  // アルファベットのみを許可
                  const value = e.target.value.replace(/[^A-Za-z]/g, "");
                  handleInputChange("sigAbbreviation", value);
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
            </>
          )}
        </div>

        {isContinuation ? (
          <div className="section">
            <h2 className="section-title">
              <span className="section-number">{sectionNo.submitter}</span>
              提出者（筆頭幹事）
            </h2>
            <div className="form-group">
              <label>氏名</label>
              <input
                type="text"
                value={formData.leadSecretary.name}
                onChange={(e) => updateLeadSecretary("name", e.target.value)}
                placeholder="山田太郎"
              />
            </div>
            <div className="form-group">
              <label>メールアドレス</label>
              <input
                type="email"
                value={formData.leadSecretary.email}
                onChange={(e) => updateLeadSecretary("email", e.target.value)}
                placeholder="example@university.ac.jp"
                title="正しいメールアドレス形式で入力してください"
              />
            </div>
            <div className="note">
              幹事団・運営委員に変更がある場合は、年度末の活動報告書または随時の届出にて研究活性化委員会に報告してください。
            </div>
          </div>
        ) : (
          <>
        {/* 2. 提案者 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">{sectionNo.proposers}</span>
            提案者
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>役割</th>
                  <th>氏名</th>
                  <th>会員番号</th>
                  <th>所属</th>
                  <th>メールアドレス</th>
                  <th style={{ width: "80px" }}>操作</th>
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
                      onChange={(e) => updateLeadSecretary("name", e.target.value)}
                      placeholder="山田太郎"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formData.leadSecretary.memberId}
                      onChange={(e) => updateLeadSecretary("memberId", e.target.value)}
                      placeholder="12345"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={formData.leadSecretary.affiliation}
                      onChange={(e) => updateLeadSecretary("affiliation", e.target.value)}
                      placeholder="〇〇大学"
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      value={formData.leadSecretary.email}
                      onChange={(e) => updateLeadSecretary("email", e.target.value)}
                      placeholder="example@university.ac.jp"
                      title="正しいメールアドレス形式で入力してください"
                    />
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", color: "#999" }}>固定</span>
                  </td>
                </tr>
                {/* 幹事・運営委員 */}
                {formData.proposers.map((proposer, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={proposer.role}
                        onChange={(e) => updateProposer(index, "role", e.target.value)}
                      >
                        <option value="幹事">幹事</option>
                        <option value="運営委員">運営委員</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposer.name}
                        onChange={(e) => updateProposer(index, "name", e.target.value)}
                        placeholder="佐藤花子"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposer.memberId}
                        onChange={(e) => updateProposer(index, "memberId", e.target.value)}
                        placeholder="12345"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposer.affiliation}
                        onChange={(e) => updateProposer(index, "affiliation", e.target.value)}
                        placeholder="△△大学"
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={proposer.email}
                        onChange={(e) => updateProposer(index, "email", e.target.value)}
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
            筆頭幹事1名と幹事・運営委員2名以上（合計3名以上）が必要です。幹事は1～3名としてください。筆頭幹事・幹事は正会員、運営委員は正会員または学生会員であることが必要です。メールアドレスは、筆頭幹事および幹事のみで構いません。SIGメンバーは採択後に別途フォームで登録するため、ここに記載する必要はありません。
          </div>
        </div>

        {/* 3. 研究テーマの概要 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">{sectionNo.overview}</span>
            本SIGにおける研究テーマの概要
          </h2>
          <div className="form-group">
            <label>研究テーマの概要（学術的・社会的課題などの背景を含む）</label>
            <textarea
              value={formData.overview}
              onChange={(e) => handleInputChange("overview", e.target.value)}
              placeholder="学術的・社会的課題などの背景を含めて、研究テーマの概要を500文字程度で記述してください"
              style={{ minHeight: "200px" }}
            />
            <div className={getCharCountClass(formData.overview.length, 550)}>
              {formData.overview.length} / 500文字程度
            </div>
          </div>
        </div>

        {/* 4. 学術的「問い」 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">{sectionNo.questions}</span>
            本SIGテーマのもとで共有したい学術的「問い」の例
          </h2>
          {formData.questions.map((question, index) => (
            <div key={index} className="form-group">
              <label>問い {index + 1}</label>
              <div style={{ display: "flex", gap: "10px" }}>
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
            <span className="section-number">{sectionNo.effects}</span>
            本SIGの活動によって、本学会において期待される効果
          </h2>
          <div className="form-group">
            <textarea
              value={formData.expectedEffects}
              onChange={(e) => handleInputChange("expectedEffects", e.target.value)}
              placeholder="本SIGの活動が本学会にもたらす学術的・実践的な貢献や効果について、500文字程度で記述してください"
              style={{ minHeight: "200px" }}
            />
            <div className={getCharCountClass(formData.expectedEffects.length, 550)}>
              {formData.expectedEffects.length} / 500文字程度
            </div>
          </div>
        </div>

          </>
        )}

        {/* 次年度の種別（継続）／第一種SIG希望（新規） */}
        {isContinuation ? (
          <div className="section">
            <h2 className="section-title">
              <span className="section-number">{sectionNo.sigClass}</span>
              SIGの種別
            </h2>
            <div className="note" style={{ marginBottom: "15px" }}>
              SIGの種別は、前年度の活動実績で決まります。{FISCAL_YEAR}年度の種別は{FISCAL_YEAR - 1}
              年度の実績で、{FISCAL_YEAR + 1}年度の種別は{FISCAL_YEAR}
              年度の実績（この計画書の内容）で決まるため、2つの年度についてそれぞれ回答してください。
            </div>

            <div className="form-group">
              <label>
                （1）{FISCAL_YEAR}年度の種別（{FISCAL_YEAR - 1}年度の実績で決まります）
              </label>
              <div className="note" style={{ marginBottom: "10px" }}>
                {FISCAL_YEAR - 1}
                年度内に、全国大会における企画セッションを実施し、かつ研究会における企画セッションを2回以上実施している場合は「第一種SIG」を選択してください。年度末までの活動により満たす見込みの場合も含みます。
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {renderRadioOption("nextYearClass", "第一種", "第一種SIG（見込みを含む）")}
                {renderRadioOption("nextYearClass", "第二種", "第二種SIG")}
              </div>
              {isFirstClassPlan && (
                <div
                  className="note"
                  style={{
                    marginTop: "10px",
                    background: "#fff3cd",
                    borderLeft: "4px solid #ffc107",
                  }}
                >
                  ※第一種SIG（見込みを含む）の場合は、最後の「予算案」も記入してください。
                </div>
              )}
            </div>

            <div className="form-group">
              <label>
                （2）{FISCAL_YEAR + 1}年度に第一種SIGとして活動することを希望しますか？（
                {FISCAL_YEAR}年度の実績で決まります）
              </label>
              <div className="note" style={{ marginBottom: "10px" }}>
                希望する場合は、{FISCAL_YEAR}
                年度内に、全国大会における企画セッションを実施し、かつ研究会における企画セッションを2回以上実施する必要があります。現在第一種SIGで、
                {FISCAL_YEAR + 1}年度も第一種SIGを続けたい場合も「希望する」を選択してください。
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {renderRadioOption(
                  "firstClassPromotion",
                  "希望する",
                  "希望する、もしくは希望する可能性がある",
                )}
                {renderRadioOption("firstClassPromotion", "希望しない", "希望することはない")}
              </div>
              {formData.firstClassPromotion === "希望する" && (
                <div
                  className="note"
                  style={{
                    marginTop: "10px",
                    background: "#fff3cd",
                    borderLeft: "4px solid #ffc107",
                  }}
                >
                  ※以下（{sectionNo.sessions}
                  ）の企画セッション実施予定において、全国大会を含め、かつ研究会を2回以上選択してください。
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="section">
            <h2 className="section-title">
              <span className="section-number">{sectionNo.sigClass}</span>
              今回提案する{FISCAL_YEAR}年度の次の年度（{FISCAL_YEAR + 1}
              年度）から第一種SIGとして活動することを希望しますか？
            </h2>
            <div className="note" style={{ marginBottom: "15px" }}>
              ※希望する場合は、{FISCAL_YEAR}
              年度内に、全国大会における企画セッションを企画・実施し、かつ研究会における企画セッションを2回以上企画・実施する必要があります。
            </div>
            <div className="form-group">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {renderRadioOption(
                  "firstClassPromotion",
                  "希望する",
                  "希望する、もしくは希望する可能性がある",
                )}
                {renderRadioOption("firstClassPromotion", "希望しない", "希望することはない")}
              </div>
            </div>
            {formData.firstClassPromotion === "希望する" && (
              <div
                className="note"
                style={{ marginTop: "15px", background: "#fff3cd", borderLeft: "4px solid #ffc107" }}
              >
                ※第一種SIG希望の場合は、以下（{sectionNo.sessions}
                ）の企画セッション実施予定において、全国大会を含め、かつ研究会を2回以上選択してください。
              </div>
            )}
          </div>
        )}

        {/* 7. 企画セッション実施予定 */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">{sectionNo.sessions}</span>
            企画セッションをどの大会・研究会で企画・実施予定か
          </h2>
          <div className="note" style={{ marginBottom: "15px" }}>
            現時点の想定を回答してください。複数回予定している場合はすべて選択してください。
            ※研究会は2026年度から全5回の開催となります。開催月は現時点の見込みであり、今後変更になる可能性があります。
          </div>
          <div className="checkbox-group">
            {SESSION_OPTIONS.map((option) => (
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
          {Object.values(formData.plannedSessions).some((v) => v) && (
            <div className="session-details">
              <h4>選択した企画セッションのうち1回について詳細を記載してください</h4>
              <div className="note" style={{ marginBottom: "15px" }}>
                全国大会の企画セッションを予定している場合は、それについて記載してください。
                全国大会の企画セッションを予定していない場合は、任意の研究会の企画について記載してください。
              </div>

              {/* 全国大会選択時の重要な注意 */}
              {formData.plannedSessions.national && (
                <div
                  className="note"
                  style={{
                    marginBottom: "15px",
                    background: "#fff3cd",
                    borderLeft: "4px solid #ffc107",
                    padding: "15px",
                    fontWeight: "bold",
                  }}
                >
                  <strong style={{ color: "#856404", fontSize: "14px" }}>
                    【重要】全国大会を選択される場合へ
                  </strong>
                  <p style={{ marginTop: "10px", lineHeight: "1.6", color: "#856404" }}>
                    {isContinuation
                      ? "全国大会の企画セッションは、ここで記載したセッション名、セッションの概要を原則そのまま用いて、研究活性化委員会がとりまとめて全国大会プログラム部会へ申請します。"
                      : "SIGが採択された場合は、全国大会の企画セッションにおけるセッション名、セッションの概要はここで記載したものを原則そのまま記載して、研究活性化委員会に別途提出していただきます。"}
                    十分に推敲の上、記入してください。
                  </p>
                </div>
              )}

              <div className="form-group">
                <label>どの研究会/大会で実施するか</label>
                <select
                  value={formData.sessionDetails.target}
                  onChange={(e) =>
                    handleNestedInputChange("sessionDetails", "target", e.target.value)
                  }
                >
                  <option value="">選択してください</option>
                  {SESSION_OPTIONS.map(
                    (option) =>
                      formData.plannedSessions[option.key] && (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ),
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>セッション名（案）</label>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      whiteSpace: "nowrap",
                      color: "#666",
                    }}
                  >
                    SIG-{formData.sigAbbreviation || "___"}：
                  </span>
                  <input
                    type="text"
                    value={formData.sessionDetails.name}
                    onChange={(e) =>
                      handleNestedInputChange("sessionDetails", "name", e.target.value)
                    }
                    placeholder="例：教育システム情報学の展望と課題"
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="note" style={{ marginTop: "5px" }}>
                  セッション名には自動的に「SIG-{formData.sigAbbreviation || "略称"}
                  ：」が付与されます
                </div>
              </div>

              <div className="form-group">
                <label>セッションの概要（400字程度）</label>
                <textarea
                  value={formData.sessionDetails.overview}
                  onChange={(e) =>
                    handleNestedInputChange("sessionDetails", "overview", e.target.value)
                  }
                  placeholder="企画セッションのテーマ、目的、期待される議論の内容などについて、400字程度で記述してください"
                  style={{ minHeight: "150px" }}
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
                  onChange={(e) =>
                    handleNestedInputChange("sessionDetails", "keywords", e.target.value)
                  }
                  placeholder="例：キーワード1，キーワード2，キーワード3（カンマ区切りで5個程度）"
                />
              </div>

              <div className="form-group">
                <label>発表者リスト（3名以上）</label>
                <textarea
                  value={formData.sessionDetails.presenters}
                  onChange={(e) =>
                    handleNestedInputChange("sessionDetails", "presenters", e.target.value)
                  }
                  placeholder="氏名1（所属機関1），氏名2（所属機関2），氏名3（所属機関3）"
                  style={{ minHeight: "80px" }}
                />
                <div className="note">提案時点の見込みで構いません</div>
              </div>

              {/* 全国大会選択時のみオーガナイザ入力欄を表示 */}
              {formData.sessionDetails.target === "national" && (
                <div className="form-group">
                  <label>オーガナイザ</label>
                  <textarea
                    value={formData.sessionDetails.organizers}
                    onChange={(e) =>
                      handleNestedInputChange("sessionDetails", "organizers", e.target.value)
                    }
                    placeholder="氏名1（所属機関1），氏名2（所属機関2），氏名3（所属機関3）"
                    style={{ minHeight: "80px" }}
                  />
                  <div className="note">
                    全国大会の企画セッションのオーガナイザを記載してください。筆頭幹事を必ず含めてください。
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 8. 年間活動スケジュール */}
        <div className="section">
          <h2 className="section-title">
            <span className="section-number">{sectionNo.schedule}</span>
            年間活動スケジュール（4月～翌3月）
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>月</th>
                  <th>活動内容</th>
                  <th style={{ width: "80px" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {formData.schedule.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={item.month}
                        onChange={(e) => updateSchedule(index, "month", e.target.value)}
                        placeholder="4月"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.activities}
                        onChange={(e) => updateSchedule(index, "activities", e.target.value)}
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

        {/* 予算案（継続かつ第一種・第一種見込みのみ） */}
        {isFirstClassPlan && (
          <div className="section">
            <h2 className="section-title">
              <span className="section-number">{sectionNo.budget}</span>
              {FISCAL_YEAR}年度 予算案
            </h2>
            <div className="note" style={{ marginBottom: "15px" }}>
              費目ごとに、金額（千円単位）と予算の根拠（何に・どのくらい使うか）を記入例のように簡単に記入してください。金額は概算で構いません。予算を必要としない費目は空欄のままにしてください。予算総額の上限は
              {BUDGET_LIMIT / 10}万円（入力値で{BUDGET_LIMIT}
              ）です。設備備品（PC、タブレット等）は対象外です。
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>費目</th>
                    <th style={{ width: "170px" }}>金額</th>
                    <th>予算の根拠</th>
                  </tr>
                </thead>
                <tbody>
                  {BUDGET_CATEGORIES.map((category) => (
                    <tr key={category.key}>
                      <td>
                        <strong>{category.label}</strong>
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                          {category.example}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.budget[category.key].amount}
                            onChange={(e) => updateBudget(category.key, "amount", e.target.value)}
                            placeholder="0"
                            maxLength="4"
                            style={{ textAlign: "right" }}
                          />
                          <span style={{ whiteSpace: "nowrap", fontSize: "14px" }}>,000円</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={formData.budget[category.key].rationale}
                          onChange={(e) => updateBudget(category.key, "rationale", e.target.value)}
                          placeholder={category.rationaleExample}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>合計</strong>
                    </td>
                    <td colSpan="2">
                      <strong style={{ color: budgetTotal > BUDGET_LIMIT ? "#c33" : "inherit" }}>
                        {(budgetTotal * 1000).toLocaleString()}円
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {budgetTotal > BUDGET_LIMIT && (
              <div
                className="note"
                style={{ background: "#fee", borderLeft: "4px solid #c33", color: "#c33" }}
              >
                予算総額が上限の{BUDGET_LIMIT / 10}万円（入力値で{BUDGET_LIMIT}
                ）を超えています。上限以内に収めてください。
              </div>
            )}
          </div>
        )}

        {/* 操作ボタン */}
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={() => {
              if (validateData()) {
                alert("✓ すべての必須項目が入力されています！");
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            style={{ fontSize: "15px", fontWeight: "bold" }}
          >
            入力チェック
          </button>
          <button
            className="btn btn-success"
            onClick={exportPDF}
            style={{ fontSize: "15px", fontWeight: "bold" }}
          >
            PDFで出力
          </button>
          <button className="btn btn-success" onClick={exportData}>
            JSONでエクスポート
          </button>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            JSONからインポート
            <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
          </label>
          <button className="btn btn-secondary" onClick={clearData}>
            データをクリア
          </button>
        </div>
      </div>
      )}

      {/* 印刷用コンテンツ（通常時は非表示） */}
      <div className="print-only" style={{ display: "none", padding: "20mm", fontFamily: "serif" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "18pt", marginBottom: "10px" }}>
            {documentTitle}
          </h1>
          <p style={{ textAlign: "right", marginTop: "20px" }}>{dateLabel}：{formData.submissionDate}</p>
        </div>

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            {sectionNo.name}　SIGの名称
          </h2>
          <table
            className="print-table"
            style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    width: "30%",
                    background: "#f0f0f0",
                  }}
                >
                  正式名称（和）
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  SIG-{formData.sigNameJa}
                </td>
              </tr>
              {!isContinuation && (
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0" }}>
                  正式名称（英）
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  SIG-{formData.sigNameEn}
                </td>
              </tr>
              )}
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0" }}>
                  略称
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  SIG-{formData.sigAbbreviation}
                </td>
              </tr>
            </tbody>
          </table>
          {!isContinuation && (
            <p style={{ fontSize: "9pt", color: "#666" }}>
              （注）正式名称はできる限り簡潔にしてください。また、略称はアルファベット2～5文字で設定してください。
            </p>
          )}
        </div>

        {isContinuation ? (
          <>
            <div className="print-section">
              <h2 style={printHeadingStyle}>{sectionNo.submitter}　提出者（筆頭幹事）</h2>
              <p>
                {formData.leadSecretary.name}（{formData.leadSecretary.email}）
              </p>
            </div>

            <div className="print-section">
              <h2 style={printHeadingStyle}>
                {sectionNo.sigClass}　SIGの種別
              </h2>
              <p>
                （1）{FISCAL_YEAR}年度の種別:{" "}
                <strong>
                  {formData.nextYearClass
                    ? `${formData.nextYearClass}SIG${isFirstClassPlan ? "（見込みを含む）" : ""}`
                    : "（未選択）"}
                </strong>
              </p>
              <p>
                （2）{FISCAL_YEAR + 1}年度に第一種SIGとして活動することを:{" "}
                <strong>{formData.firstClassPromotion || "（未選択）"}</strong>
              </p>
            </div>
          </>
        ) : (
          <>
        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            2　提案者
          </h2>
          <table
            className="print-table"
            style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}
          >
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ border: "1px solid #333", padding: "8px", width: "12%" }}>役割</th>
                <th style={{ border: "1px solid #333", padding: "8px", width: "15%" }}>氏名</th>
                <th style={{ border: "1px solid #333", padding: "8px", width: "12%" }}>会員番号</th>
                <th style={{ border: "1px solid #333", padding: "8px", width: "25%" }}>所属</th>
                <th style={{ border: "1px solid #333", padding: "8px" }}>メールアドレス</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>筆頭幹事</td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  {formData.leadSecretary.name}
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  {formData.leadSecretary.memberId}
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  {formData.leadSecretary.affiliation}
                </td>
                <td style={{ border: "1px solid #333", padding: "8px", fontSize: "9pt" }}>
                  {formData.leadSecretary.email}
                </td>
              </tr>
              {formData.proposers.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #333", padding: "8px" }}>{p.role}</td>
                  <td style={{ border: "1px solid #333", padding: "8px" }}>{p.name}</td>
                  <td style={{ border: "1px solid #333", padding: "8px" }}>{p.memberId}</td>
                  <td style={{ border: "1px solid #333", padding: "8px" }}>{p.affiliation}</td>
                  <td style={{ border: "1px solid #333", padding: "8px", fontSize: "9pt" }}>
                    {p.email || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: "9pt", color: "#666" }}>
            （注）運営委員が複数いる場合は、適宜行を追加してください。メールアドレスは、筆頭幹事および幹事のみで構いません。
          </p>
        </div>

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            3　本SIGにおける研究テーマの概要
          </h2>
          <p style={{ textAlign: "justify", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
            {formData.overview}
          </p>
        </div>

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            4　本SIGテーマのもとで共有したい学術的「問い」の例
          </h2>
          <ul style={{ marginLeft: "20px" }}>
            {formData.questions
              .filter((q) => q.trim())
              .map((q, idx) => (
                <li key={idx} style={{ marginBottom: "8px" }}>
                  {q}
                </li>
              ))}
          </ul>
        </div>

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            5　本SIGの活動によって、本学会において期待される効果
          </h2>
          <p style={{ textAlign: "justify", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
            {formData.expectedEffects}
          </p>
        </div>

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            6　今回提案する{FISCAL_YEAR}年度の次の年度（{FISCAL_YEAR + 1}
            年度）から第一種SIGとして活動することを希望しますか？
          </h2>
          <p style={{ marginBottom: "10px", fontSize: "10pt", color: "#666" }}>
            ※希望する場合は、{FISCAL_YEAR}
            年度内に、全国大会における企画セッションを企画・実施し、かつ研究会における企画セッションを2回以上企画・実施する必要があります。
          </p>
          <p style={{ fontWeight: "bold", marginTop: "10px" }}>
            回答: {formData.firstClassPromotion || "（未選択）"}
          </p>
        </div>

          </>
        )}

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            {sectionNo.sessions}　企画セッション実施予定
          </h2>
          <p style={{ marginBottom: "10px" }}>
            {SESSION_OPTIONS.filter((option) => formData.plannedSessions[option.key])
              .map((option) => option.label)
              .join("、")}
          </p>
          {formData.sessionDetails.target && (
            <div
              style={{
                background: "#f9f9f9",
                padding: "15px",
                border: "1px solid #ddd",
                marginTop: "10px",
              }}
            >
              <h3 style={{ fontSize: "12pt", marginBottom: "10px" }}>企画セッション詳細</h3>
              <p>
                <strong>実施:</strong> {getSessionLabel(formData.sessionDetails.target)}
              </p>
              <p>
                <strong>セッション名:</strong> SIG-{formData.sigAbbreviation}：
                {formData.sessionDetails.name}
              </p>
              <p style={{ textAlign: "justify", whiteSpace: "pre-wrap" }}>
                <strong>概要:</strong> {formData.sessionDetails.overview}
              </p>
              <p>
                <strong>キーワード:</strong> {formData.sessionDetails.keywords}
              </p>
              <p>
                <strong>発表者:</strong> {formData.sessionDetails.presenters}
              </p>
              {formData.sessionDetails.target === "national" &&
                formData.sessionDetails.organizers && (
                  <p>
                    <strong>オーガナイザ:</strong> {formData.sessionDetails.organizers}
                  </p>
                )}
            </div>
          )}
        </div>

        <div className="print-section">
          <h2
            style={{
              fontSize: "14pt",
              borderBottom: "2px solid #333",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            {sectionNo.schedule}　年間活動スケジュール（4月～翌3月）
          </h2>
          <table className="print-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {formData.schedule
                .filter((s) => s.month && s.activities)
                .map((s, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        border: "1px solid #333",
                        padding: "8px",
                        width: "15%",
                        background: "#f0f0f0",
                      }}
                    >
                      {s.month}
                    </td>
                    <td style={{ border: "1px solid #333", padding: "8px" }}>{s.activities}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {isFirstClassPlan && (
          <div className="print-section">
            <h2 style={printHeadingStyle}>
              {sectionNo.budget}　{FISCAL_YEAR}年度 予算案
            </h2>
            <table className="print-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={{ border: "1px solid #333", padding: "8px", width: "20%" }}>費目</th>
                  <th style={{ border: "1px solid #333", padding: "8px", width: "20%" }}>金額</th>
                  <th style={{ border: "1px solid #333", padding: "8px" }}>予算の根拠</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_CATEGORIES.map((category) => (
                  <tr key={category.key}>
                    <td style={{ border: "1px solid #333", padding: "8px" }}>{category.label}</td>
                    <td style={{ border: "1px solid #333", padding: "8px", textAlign: "right" }}>
                      {((parseInt(formData.budget[category.key].amount, 10) || 0) * 1000).toLocaleString()}
                      円
                    </td>
                    <td style={{ border: "1px solid #333", padding: "8px" }}>
                      {formData.budget[category.key].rationale}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0" }}>
                    合計
                  </td>
                  <td
                    style={{
                      border: "1px solid #333",
                      padding: "8px",
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    {(budgetTotal * 1000).toLocaleString()}円
                  </td>
                  <td style={{ border: "1px solid #333", padding: "8px" }}></td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "9pt", color: "#666", marginTop: "5px" }}>（注）金額は概算です。</p>
          </div>
        )}

        <p style={{ textAlign: "right", marginTop: "40px" }}>以上</p>
      </div>
    </div>
  );
};

export default App;
