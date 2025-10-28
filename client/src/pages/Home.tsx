'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function Home() {
  const [title, setTitle] = useState('영어 독해 및 번역 연습');
  const [subtitle, setSubtitle] = useState('');
  const [templateType, setTemplateType] = useState('translation');
  const [englishText, setEnglishText] = useState('');
  const [koreanText, setKoreanText] = useState('');
  const [showKoreanRef, setShowKoreanRef] = useState('yes');
  const [worksheetHTML, setWorksheetHTML] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [printDisabled, setPrintDisabled] = useState(true);

  // 문장 파싱 함수
  const parseSentences = (text: string): string[] => {
    const sentenceMatches = text.match(/[^.!?]+[.!?]+/g) || [];
    const sentences: string[] = [...sentenceMatches];
    let lastPart = text.replace(/[^.!?]+[.!?]+/g, '').trim();
    if (lastPart.length > 0) {
      sentences.push(lastPart);
    }
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  };

  // 빈칸 채우기 생성 (개선된 버전)
  const createFillInTheBlanks = (
    sentence: string
  ): { text: string; wordList: string } => {
    const words = sentence.split(/\s+/);
    const result: string[] = [];
    const blankedWords: string[] = [];

    // 모든 단어 중 일부를 빈칸으로 처리 (3개 단어마다 1개 빈칸)
    words.forEach((word, index) => {
      const cleanedWord = word.replace(/[.,?!;]/g, '');
      if (index % 3 === 2 && cleanedWord.length > 2) {
        result.push(`<span class="blank">_____</span>`);
        blankedWords.push(cleanedWord);
      } else {
        result.push(word);
      }
    });

    return {
      text: result.join(' '),
      wordList: blankedWords.length > 0 ? blankedWords.join(', ') : '(빈칸 없음)',
    };
  };

  // 순서 배열 생성
  const createScrambledSentence = (sentence: string): string => {
    const words: string[] = sentence.split(/\s+/);
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    return shuffledWords.join(' / ');
  };

  // HTML 이스케이프
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 문장 블록 생성
  const createSentenceBlock = (
    number: number,
    englishSentence: string,
    koreanTranslation: string,
    type: string,
    showRef: boolean
  ): string => {
    let content = '';
    const numDisplay = `<div class="sentence-number">${number}.</div>`;

    switch (type) {
      case 'translation':
        content = `
          <div class="english-text">${escapeHtml(englishSentence)}</div>
          <div class="korean-space"></div>
        `;
        break;
      case 'analysis':
        content = `
          <div class="english-text">${escapeHtml(englishSentence)}</div>
          <div class="analysis-label">문장 구조 분석 (SVOC, 구문 등)</div>
          <div class="analysis-space"></div>
        `;
        break;
      case 'fill-in':
        const fillInData = createFillInTheBlanks(englishSentence);
        content = `
          <div class="english-text" style="line-height: 2;">${fillInData.text}</div>
          <div class="analysis-label">빈칸 채우기</div>
          <div class="korean-space" style="min-height: 12mm;"></div>
          <div class="word-list">**힌트 단어:** ${fillInData.wordList}</div>
        `;
        break;
      case 'scramble':
        const scrambledText = createScrambledSentence(englishSentence);
        content = `
          <div class="scrambled-text">${scrambledText}</div>
          <div class="analysis-label">순서 배열</div>
          <div class="reorder-space"></div>
        `;
        break;
      case 'korean-only':
        content = `
          <div class="korean-text" style="margin-bottom: 8mm;">${escapeHtml(koreanTranslation || '한국어 번역 없음')}</div>
          <div class="analysis-label">영작하기</div>
          <div class="english-composition-container">
            <div class="english-composition-space"></div>
          </div>
        `;
        break;
    }

    let block = `<div class="sentence-block">${numDisplay}${content}`;
    if (showRef && koreanTranslation && type !== 'korean-only') {
      block += `<div class="korean-reference">**참고 해석:** ${escapeHtml(koreanTranslation)}</div>`;
    }
    block += `</div>`;
    return block;
  };

  // 페이지 헤더 생성
  const createPageHeader = (
    pageTitle: string,
    pageSubtitle: string,
    type: string
  ): string => {
    const templateName: Record<string, string> = {
      translation: '1. 번역 연습 (기본)',
      analysis: '2. 문장 구조 분석 (SVOC)',
      'fill-in': '3. 빈칸 채우기 (주요 어휘/구문)',
      scramble: '4. 순서 배열 (단어/구문 섞기)',
      'korean-only': '5. 영작하기 (한글 번역 참고)',
    };

    let header = `
      <div class="worksheet-header">
        <div class="worksheet-title">${escapeHtml(pageTitle)}</div>
        <div class="worksheet-subtitle">${escapeHtml(templateName[type] || '워크북')}</div>
    `;

    if (pageSubtitle) {
      header += `<div class="worksheet-subtitle">${escapeHtml(pageSubtitle)}</div>`;
    }

    header += `
      </div>
      <div class="worksheet-content">
    `;

    return header;
  };

  // 워크북 생성
  const generateWorkbook = () => {
    if (!englishText.trim()) {
      setMessage({ type: 'error', text: '영어 지문을 입력해주세요.' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    const englishSentences = parseSentences(englishText);
    const koreanSentences = koreanText ? parseSentences(koreanText) : [];

    if (englishSentences.length === 0) {
      setMessage({ type: 'error', text: '유효한 문장을 찾을 수 없습니다.' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (
      koreanText &&
      englishSentences.length !== koreanSentences.length
    ) {
      setMessage({
        type: 'error',
        text: `문장 개수가 일치하지 않습니다. 영어 문장: ${englishSentences.length}개, 한국어 문장: ${koreanSentences.length}개`,
      });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    let html = createPageHeader(title, subtitle, templateType);

    englishSentences.forEach((sentence, index) => {
      const koreanTranslation = koreanSentences[index] || '';
      html += createSentenceBlock(
        index + 1,
        sentence,
        koreanTranslation,
        templateType,
        showKoreanRef === 'yes'
      );
    });

    html += '</div>';
    setWorksheetHTML(html);
    setPrintDisabled(false);

    setMessage({
      type: 'success',
      text: `워크북이 생성되었습니다. (${englishSentences.length}개 문장, 1페이지)`,
    });
    setTimeout(() => setMessage(null), 5000);
  };

  // 초기 예제 로드
  useEffect(() => {
    const exampleText = `Working around the whole painting, rather than concentrating on one area at a time, will mean you can stop at any point and the painting can be considered "finished." Artists often find it difficult to know when to stop painting, and it can be tempting to keep on adding more to your work. It is important to take a few steps back from the painting from time to time to assess your progress. Putting too much into a painting can spoil its impact and leave it looking overworked. If you find yourself struggling to decide whether you have finished, take a break and come back to it later with fresh eyes. Then you can decide whether any areas of your painting would benefit from further refinement.`;

    const exampleKorean = `한 번에 한 영역에만 집중하기보다 전체 그림에 대해서 작업하는 것은 여러분이 어떤 지점에서도 멈출 수 있고 그림이 '완성'된 것으로 간주될 수 있다는 것을 의미할 것이다. 화가인 여러분은 종종 언제 그림을 멈춰야 할지 알기 어렵다는 것을 발견하고, 자신의 그림에 계속해서 더 추가하고 싶은 유혹을 느낄 수도 있다. 때때로 자신의 진행 상황을 평가하기 위해 그림에서 몇 걸음 뒤로 물러나는 것이 중요하다. 한 그림에 너무 많은 것을 넣으면 그것의 영향력을 망칠 수 있고 그것이 과하게 작업된 것처럼 보이게 둘 수 있다. 만약 여러분이 끝냈는지를 결정하는 데 자신이 어려움을 겪고 있음을 알게 된다면, 잠시 휴식을 취하고 나중에 새로운 눈으로 그것(그림)으로 다시 돌아와라. 그러면 여러분은 더 정교하게 꾸며서 자신의 그림 어느 부분이 득을 볼지를 결정할 수 있다.`;

    setEnglishText(exampleText);
    setKoreanText(exampleKorean);
  }, []);

  // 입력 변경 시 자동 생성
  useEffect(() => {
    if (englishText) {
      generateWorkbook();
    }
  }, [templateType, showKoreanRef]);

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <style>{`
        :root {
          --primary-color: #007bff;
          --secondary-color: #6c757d;
          --success-color: #28a745;
          --border-color: #dee2e6;
          --text-color: #212529;
          --light-gray: #f8f9fa;
          --a4-width: 210mm;
          --a4-height: 297mm;
          --margin-size: 15mm;
          --font-size-base: 10pt;
          --line-height-base: 1.5;
        }

        .container {
          display: flex;
          gap: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .control-panel {
          width: 380px;
          flex-shrink: 0;
          background: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          height: fit-content;
          position: sticky;
          top: 20px;
        }

        .control-panel h1 {
          font-size: 1.5em;
          color: var(--primary-color);
          margin-bottom: 20px;
          text-align: center;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 0.95em;
          color: var(--text-color);
        }

        .form-group textarea,
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }

        .form-group textarea {
          min-height: 150px;
          font-family: 'Courier New', monospace;
          line-height: 1.5;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .preview-panel {
          flex: 1;
          background-color: #f1f3f5;
          padding: 20px;
          border-radius: 8px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
        }

        .preview-title {
          font-size: 1.2em;
          font-weight: bold;
          color: var(--text-color);
          margin-bottom: 15px;
          text-align: center;
        }

        .worksheet {
          width: var(--a4-width);
          min-height: var(--a4-height);
          background: white;
          margin: 0 auto 20px;
          padding: var(--margin-size);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          page-break-after: always;
          page-break-inside: avoid;
          font-size: var(--font-size-base);
          line-height: var(--line-height-base);
        }

        .worksheet-header {
          text-align: center;
          margin-bottom: 10mm;
          padding-bottom: 5mm;
          border-bottom: 1px solid #333;
        }

        .worksheet-title {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 3mm;
          color: #000;
        }

        .worksheet-subtitle {
          font-size: 9pt;
          color: #555;
          margin-bottom: 1mm;
        }

        .worksheet-content {
          column-count: 2;
          column-gap: 10mm;
          height: 100%;
          max-height: calc(var(--a4-height) - 2 * var(--margin-size) - 20mm);
          overflow: hidden;
        }

        .sentence-block {
          page-break-inside: avoid;
          break-inside: avoid-column;
          margin-bottom: 10mm;
          padding-bottom: 3mm;
          border-bottom: 1px dashed #eee;
        }

        .sentence-number {
          font-size: 9pt;
          font-weight: bold;
          color: var(--primary-color);
          margin-bottom: 2mm;
        }

        /* 템플릿별 스타일 */
        .template-translation .english-text {
          font-size: 10pt;
          line-height: 1.4;
          color: #000;
          margin-bottom: 3mm;
        }
        .template-translation .korean-space {
          border-bottom: 1px solid #999;
          min-height: 15mm;
          margin-bottom: 2mm;
        }

        .template-analysis .english-text {
          font-size: 10pt;
          line-height: 1.6;
          color: #000;
          margin-bottom: 3mm;
          font-weight: bold;
        }
        .template-analysis .analysis-space {
          border: 1px solid #ddd;
          min-height: 20mm;
          padding: 3mm;
          background-color: #fcfcfc;
          margin-bottom: 2mm;
          font-size: 9pt;
        }
        .template-analysis .analysis-label {
          font-size: 9pt;
          font-weight: normal;
          color: #555;
          margin-bottom: 1mm;
        }

        .template-fill-in .english-text {
          font-size: 10pt;
          line-height: 1.8;
          color: #000;
          margin-bottom: 3mm;
        }
        .template-fill-in .english-text span.blank {
          border-bottom: 2px solid #000;
          padding: 0 5mm;
          font-weight: bold;
          color: transparent;
          background-color: #fff;
        }
        .template-fill-in .word-list {
          font-size: 8pt;
          color: #888;
          margin-top: 2mm;
          padding: 3mm;
          border: 1px dashed #ccc;
        }

        .template-scramble .english-text {
          display: none;
        }
        .template-scramble .scrambled-text {
          font-size: 10pt;
          line-height: 1.8;
          color: #555;
          background-color: #f9f9f9;
          padding: 5mm;
          border: 1px solid #eee;
          margin-bottom: 3mm;
        }
        .template-scramble .reorder-space {
          border-bottom: 1px solid #999;
          min-height: 15mm;
          margin-bottom: 2mm;
        }

        .template-korean-only .english-text {
          display: none;
        }
        .template-korean-only .korean-text {
          font-size: 10pt;
          line-height: 1.6;
          color: #000;
          margin-bottom: 3mm;
          padding: 5mm;
          border-left: 3px solid var(--primary-color);
        }
        .template-korean-only .english-composition-container {
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 3px;
          padding: 5mm;
          margin-bottom: 2mm;
        }
        .template-korean-only .english-composition-space {
          border-bottom: 1px solid #999;
          min-height: 35mm;
          margin-bottom: 0;
        }

        .korean-reference {
          font-size: 8pt;
          color: #666;
          background-color: #f0f0f0;
          padding: 3mm;
          border-radius: 2px;
          line-height: 1.4;
          margin-top: 2mm;
          border-left: 3px solid #ccc;
        }

        .message {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          text-align: center;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
        }
        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .message.info {
          background-color: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }

        @media (max-width: 1200px) {
          .container {
            flex-direction: column;
          }
          .control-panel {
            width: 100%;
            position: static;
          }
        }

        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          .control-panel {
            display: none;
          }
          .preview-panel {
            max-height: none;
            overflow: visible;
            padding: 0;
            background: white;
          }
          .preview-title {
            display: none;
          }
          @page {
            size: A4;
            margin: 5mm;
          }
          .worksheet {
            width: 100%;
            min-height: 100%;
            max-height: none;
            margin: 0;
            padding: 10mm;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .worksheet:last-child {
            page-break-after: auto;
          }
          .worksheet-content {
            column-count: 2;
            column-gap: 8mm;
            max-height: none;
            overflow: visible;
          }
          .sentence-block {
            page-break-inside: avoid;
            break-inside: avoid-column;
          }
        }
      `}</style>

      <div className="container">
        {/* 제어 패널 */}
        <div className="control-panel">
          <h1>📚 영어 워크북 생성기</h1>

          <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500 text-sm text-gray-600 mb-4">
            영어 지문을 문장별로 파싱하여 5가지 유형의 A4 2단 최적화 학습지를 생성합니다.
          </div>

          <div className="form-group">
            <label htmlFor="title">워크북 제목</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 영어 독해 연습"
            />
          </div>

          <div className="form-group">
            <label htmlFor="subtitle">부제목 (선택사항)</label>
            <input
              type="text"
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="예: 고등 필수 지문"
            />
          </div>

          <div className="form-group">
            <label htmlFor="templateType">학습지 유형 선택</label>
            <select
              id="templateType"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
            >
              <option value="translation">1. 번역 연습 (기본)</option>
              <option value="analysis">2. 문장 구조 분석 (SVOC)</option>
              <option value="fill-in">3. 빈칸 채우기 (주요 어휘/구문)</option>
              <option value="scramble">4. 순서 배열 (단어/구문 섞기)</option>
              <option value="korean-only">5. 영작하기 (한글 번역 참고)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="englishText">영어 지문 *</label>
            <textarea
              id="englishText"
              value={englishText}
              onChange={(e) => setEnglishText(e.target.value)}
              placeholder="영어 지문을 여기에 붙여넣으세요. 마침표(.)를 기준으로 문장이 구분됩니다."
            />
          </div>

          <div className="form-group">
            <label htmlFor="koreanText">한국어 번역 (선택사항)</label>
            <textarea
              id="koreanText"
              value={koreanText}
              onChange={(e) => setKoreanText(e.target.value)}
              placeholder="영어 지문에 대한 한국어 번역을 문장 순서에 맞게 입력하세요. (선택사항)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="showKoreanRef">한국어 번역 참고 자료 표시</label>
            <select
              id="showKoreanRef"
              value={showKoreanRef}
              onChange={(e) => setShowKoreanRef(e.target.value)}
            >
              <option value="no">아니오</option>
              <option value="yes">예</option>
            </select>
          </div>

          <div className="button-group">
            <Button
              onClick={generateWorkbook}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              생성
            </Button>
            <Button
              onClick={() => window.print()}
              disabled={printDisabled}
              className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            >
              인쇄
            </Button>
          </div>
        </div>

        {/* 미리보기 패널 */}
        <div className="preview-panel">
          <div className="preview-title">A4 2단 출력 미리보기</div>

          {message && (
            <div className={`message ${message.type}`}>
              {message.type === 'success' && <CheckCircle size={20} />}
              {message.type === 'error' && <AlertCircle size={20} />}
              {message.type === 'info' && <Info size={20} />}
              {message.text}
            </div>
          )}

          {worksheetHTML && (
            <div
              className={`worksheet template-${templateType}`}
              dangerouslySetInnerHTML={{
                __html: worksheetHTML,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
