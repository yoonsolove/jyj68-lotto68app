document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateButton');
    const resetButton = document.getElementById('resetButton');
    const excludeNumbersInput = document.getElementById('excludeNumbers');
    const excludeRecentUnusedCheckbox = document.getElementById('excludeRecentUnused');
    const freqAnalysisCheckbox = document.getElementById('freqAnalysis');
    const oddEvenBalanceCheckbox = document.getElementById('oddEvenBalance');
    const lowHighBalanceCheckbox = document.getElementById('lowHighBalance');
    const consecutiveNumbersCheckbox = document.getElementById('consecutiveNumbers');
    const endNumberBalanceCheckbox = document.getElementById('endNumberBalance');
    const prevWinningAvoidCheckbox = document.getElementById('prevWinningAvoid');
    const lottoNumbersDiv = document.getElementById('lottoNumbers');
    const patternSummaryDiv = document.getElementById('patternSummary');
    const messageArea = document.getElementById('messageArea');

    // 로또 번호 범위 및 기본 설정
    const MIN_NUMBER = 1;
    const MAX_NUMBER = 45;
    const SELECT_COUNT = 6;
    const RECENT_MONTHS = 4; // 최근 4개월

    let allPossibleNumbers = Array.from({
        length: MAX_NUMBER
    }, (_, i) => i + 1);

    generateButton.addEventListener('click', generateLottoNumbers);
    resetButton.addEventListener('click', resetAll);

    function resetAll() {
        excludeNumbersInput.value = '';
        excludeRecentUnusedCheckbox.checked = false;
        freqAnalysisCheckbox.checked = false;
        oddEvenBalanceCheckbox.checked = false;
        lowHighBalanceCheckbox.checked = false;
        consecutiveNumbersCheckbox.checked = false;
        endNumberBalanceCheckbox.checked = false;
        prevWinningAvoidCheckbox.checked = false;
        lottoNumbersDiv.innerHTML = '';
        patternSummaryDiv.innerHTML = '';
        messageArea.textContent = '';
    }

    function generateLottoNumbers() {
        messageArea.textContent = ''; // 메시지 초기화
        lottoNumbersDiv.innerHTML = ''; // 기존 번호 초기화
        patternSummaryDiv.innerHTML = ''; // 기존 요약 초기화

        let candidateNumbers = [...allPossibleNumbers];

        // 1. 제외할 번호 처리
        const excludedByUserInput = excludeNumbersInput.value.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num) && num >= MIN_NUMBER && num <= MAX_NUMBER);
        if (excludedByUserInput.length > 0) {
            candidateNumbers = candidateNumbers.filter(num => !excludedByUserInput.includes(num));
        }

        // 2. 최근 4개월 미출현수 제외
        if (excludeRecentUnusedCheckbox.checked) {
            const recentWinningNumbers = getRecentWinningNumbers(RECENT_MONTHS); // data.js에서 가져옴
            const allRecentNumbers = new Set(recentWinningNumbers.flat());
            const unusedNumbersInRecent = allPossibleNumbers.filter(num => !allRecentNumbers.has(num));

            // 미출현수가 너무 적으면 경고 메시지
            if (unusedNumbersInRecent.length < SELECT_COUNT * 2) { // 넉넉하게 12개 미만이면 경고
                messageArea.textContent = '경고: 최근 미출현수가 적어 원하는 패턴을 충족하기 어려울 수 있습니다.';
            }
            candidateNumbers = candidateNumbers.filter(num => unusedNumbersInRecent.includes(num));
        }

        if (candidateNumbers.length < SELECT_COUNT) {
            messageArea.textContent = '선택 가능한 번호가 너무 적습니다. 제외 조건을 완화해주세요.';
            return;
        }

        let finalLottoNumbers = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 500; // 최대 시도 횟수

        while (finalLottoNumbers.length < SELECT_COUNT && attempts < MAX_ATTEMPTS) {
            let tempNumbers = selectRandomNumbers(candidateNumbers, SELECT_COUNT);
            tempNumbers.sort((a, b) => a - b); // 오름차순 정렬

            let isValid = true;
            let patterns = analyzePatterns(tempNumbers);

            // 패턴 분석 기준 적용
            if (freqAnalysisCheckbox.checked && !patterns.isFreqBalanced) isValid = false;
            if (oddEvenBalanceCheckbox.checked && !patterns.isOddEvenBalanced) isValid = false;
            if (lowHighBalanceCheckbox.checked && !patterns.isLowHighBalanced) isValid = false;
            if (consecutiveNumbersCheckbox.checked && !patterns.hasAppropriateConsecutive) isValid = false;
            if (endNumberBalanceCheckbox.checked && !patterns.isEndNumberBalanced) isValid = false;
            if (prevWinningAvoidCheckbox.checked && !patterns.avoidsPreviousWinners) isValid = false;

            if (isValid) {
                finalLottoNumbers = tempNumbers;
                displayLottoNumbers(finalLottoNumbers);
                displayPatternSummary(patterns);
            }
            attempts++;
        }

        if (finalLottoNumbers.length === 0) {
            messageArea.textContent = '죄송합니다. 선택된 조건에 맞는 번호를 찾을 수 없습니다. 조건을 완화해 주세요.';
        }
    }

    function selectRandomNumbers(sourceArray, count) {
        const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function displayLottoNumbers(numbers) {
        lottoNumbersDiv.innerHTML = '';
        numbers.forEach(num => {
            const ball = document.createElement('div');
            ball.classList.add('lotto-ball');
            ball.textContent = num;
            // 번호 범위에 따른 색상 데이터 속성 추가
            if (num >= 1 && num <= 10) ball.dataset.range = '1-10';
            else if (num >= 11 && num <= 20) ball.dataset.range = '11-20';
            else if (num >= 21 && num <= 30) ball.dataset.range = '21-30';
            else if (num >= 31 && num <= 40) ball.dataset.range = '31-40';
            else ball.dataset.range = '41-45';
            lottoNumbersDiv.appendChild(ball);
        });
    }

    function analyzePatterns(numbers) {
        const analysis = {
            oddCount: numbers.filter(n => n % 2 !== 0).length,
            evenCount: numbers.filter(n => n % 2 === 0).length,
            lowCount: numbers.filter(n => n <= 22).length, // 1~22 저, 23~45 고
            highCount: numbers.filter(n => n > 22).length,
            consecutiveGroups: [],
            endNumbers: {},
            isFreqBalanced: false,
            isOddEvenBalanced: false,
            isLowHighBalanced: false,
            hasAppropriateConsecutive: false,
            isEndNumberBalanced: false,
            avoidsPreviousWinners: false,
            freqScore: 0, // 빈도 분석 점수
        };

        // 홀짝 비율
        analysis.isOddEvenBalanced = (analysis.oddCount >= 2 && analysis.oddCount <= 4); // 2~4개 권장

        // 저고 비율 (1~22 저, 23~45 고)
        analysis.isLowHighBalanced = (analysis.lowCount >= 2 && analysis.lowCount <= 4); // 2~4개 권장

        // 연속 번호
        let currentConsecutive = [];
        for (let i = 0; i < numbers.length; i++) {
            if (i > 0 && numbers[i] === numbers[i - 1] + 1) {
                currentConsecutive.push(numbers[i]);
            } else {
                if (currentConsecutive.length > 1) {
                    analysis.consecutiveGroups.push(currentConsecutive);
                }
                currentConsecutive = [numbers[i]];
            }
        }
        if (currentConsecutive.length > 1) {
            analysis.consecutiveGroups.push(currentConsecutive);
        }
        analysis.hasAppropriateConsecutive = analysis.consecutiveGroups.every(group => group.length <= 3); // 연속 3개 이하 권장, 아예 없는 것보다 있는 게 좋음

        // 끝수 비율
        numbers.forEach(num => {
            const end = num % 10;
            analysis.endNumbers[end] = (analysis.endNumbers[end] || 0) + 1;
        });
        const uniqueEndNumbers = Object.keys(analysis.endNumbers).length;
        analysis.isEndNumberBalanced = (uniqueEndNumbers >= 4); // 4개 이상의 끝수 분포 권장 (5개가 가장 좋음)

        // 빈도 분석 (데이터 기반)
        if (typeof numberFrequencies !== 'undefined' && Object.keys(numberFrequencies).length > 0) {
            const totalFreq = numbers.reduce((sum, num) => sum + (numberFrequencies[num] || 0), 0);
            analysis.freqScore = totalFreq / SELECT_COUNT; // 평균 빈도 점수
            // 빈도 점수 기준은 상대적이므로, 적절한 균형을 위해 임계값 조정 필요
            // 여기서는 단순히 '참'으로 두어 시뮬레이션에 반영되도록 함. 실제는 더 복잡
            analysis.isFreqBalanced = (analysis.freqScore > 100); // 임의의 기준
        }

        // 최근 당첨 번호 피하기 (데이터 기반)
        if (typeof recentWinningNumbersData !== 'undefined' && recentWinningNumbersData.length > 0) {
            const lastWeekNumbers = recentWinningNumbersData[recentWinningNumbersData.length - 1];
            const overlaps = numbers.filter(num => lastWeekNumbers.includes(num));
            analysis.avoidsPreviousWinners = (overlaps.length <= 1); // 최근 당첨번호와 1개 이하로 겹치는 경우

        }
        return analysis;
    }

    function displayPatternSummary(patterns) {
        let summaryHtml = '<h3>패턴 분석 요약</h3>';
        summaryHtml += `<p><strong>홀/짝 비율:</strong> 홀 ${patterns.oddCount}개, 짝 ${patterns.evenCount}개 (${patterns.isOddEvenBalanced ? '양호' : '조정 필요'})</p>`;
        summaryHtml += `<p><strong>저/고 비율:</strong> 저 ${patterns.lowCount}개, 고 ${patterns.highCount}개 (${patterns.isLowHighBalanced ? '양호' : '조정 필요'})</p>`;

        const consecutiveText = patterns.consecutiveGroups.map(g => `${g.join('-')}(${g.length}개)`).join(', ') || '없음';
        summaryHtml += `<p><strong>연속 번호:</strong> ${consecutiveText} (${patterns.hasAppropriateConsecutive ? '양호' : '조정 필요'})</p>`;

        const endNumberText = Object.entries(patterns.endNumbers).map(([end, count]) => `${end} (${count}개)`).join(', ');
        summaryHtml += `<p><strong>끝수 분포:</strong> ${endNumberText} (${patterns.isEndNumberBalanced ? '양호' : '조정 필요'})</p>`;

        if (freqAnalysisCheckbox.checked) {
            summaryHtml += `<p><strong>출현 빈도:</strong> 평균 ${patterns.freqScore.toFixed(2)}회 이상 (${patterns.isFreqBalanced ? '양호' : '조정 필요'})</p>`;
        }
        if (prevWinningAvoidCheckbox.checked) {
            summaryHtml += `<p><strong>최근 당첨 번호 회피:</strong> ${patterns.avoidsPreviousWinners ? '양호' : '조정 필요'}</p>`;
        }

        patternSummaryDiv.innerHTML = summaryHtml;
    }
});