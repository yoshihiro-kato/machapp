document.addEventListener('DOMContentLoaded', () => {
    const standards = [
        ['FGS', 'FG'], ['FG2S', 'FG'], ['FG3S', 'FG'],
        ['3L', '正品'], ['2L', '正品'], ['L', '正品'], ['M', '正品'], ['S', '正品'], ['2S', '正品'],
        ['B3L', 'B'], ['8', 'B'], ['13', 'B'], ['20', 'B'], ['S5', 'B'],
        ['○8', 'O'], ['○13', 'O'], ['○20', 'O'], ['○S5', 'O'], ['○2S', 'O'],
        ['C', 'C'], ['C2L', 'C'], ['CL', 'C'], ['CM', 'C']
    ];
    const categoryLabels = { FG: 'FG', 正品: '正品', B: 'B規格', O: '○規格', C: 'C規格' };
    const specialCategories = new Set(['B', 'O', 'C']);
    const form = document.getElementById('shipmentForm');
    const standardsGrid = document.getElementById('standardsGrid');
    const formMessage = document.getElementById('formMessage');
    const results = document.getElementById('results');
    const palletSettings = document.getElementById('palletSettings');
    const palletCountInput = document.getElementById('palletCount');
    const palletMessage = document.getElementById('palletMessage');
    const calculatePlanButton = document.getElementById('calculatePlanButton');
    let currentRecords = [];
    let currentSummary = null;

    standardsGrid.innerHTML = standards.map(([name, category]) => `
        <div class="quantity-field">
            <label for="quantity-${name}">${name}<span>${categoryLabels[category]}</span></label>
            <input type="number" id="quantity-${name}" min="0" step="1" inputmode="numeric" placeholder="0" data-standard="${name}" data-category="${category}">
        </div>
    `).join('');

    function getRecords() {
        return [...standardsGrid.querySelectorAll('input')]
            .map((input) => ({
                standard: input.dataset.standard,
                category: input.dataset.category,
                quantity: input.value === '' ? 0 : Number(input.value)
            }))
            .filter((record) => record.quantity > 0);
    }

    function calculateSummary(records, palletCount = null) {
        // B規格の小計、○規格の小計、全体の合計を算出する
        const bSubtotal = records.filter((record) => record.category === 'B')
            .reduce((sum, record) => sum + record.quantity, 0);
        const oSubtotal = records.filter((record) => record.category === 'O')
            .reduce((sum, record) => sum + record.quantity, 0);
        const total = records.reduce((sum, record) => sum + record.quantity, 0);
        // C規格については、10㎏箱のため、パレット積みする上では2倍の数量とし、改めて合計を算出する
        const cQuantity = records.filter((record) => record.category === 'C')
            .reduce((sum, record) => sum + record.quantity, 0);
        const cAdjustedTotal = total + cQuantity;

        return {
            bSubtotal,
            oSubtotal,
            total,
            cAdjustedTotal,
            palletCount,
            averagePerPallet: palletCount ? cAdjustedTotal / palletCount : null
        };
    }

    function buildPalletPlan(records, summary) {
        // 数量の多い順に並び替える
        const sortedRecords = [...records].sort((left, right) => right.quantity - left.quantity);
        // パレットの構造体リストを作成する
        const pallets = Array.from({ length: summary.palletCount }, (_, index) => ({
            palletIndex: index + 1,
            totalQuantity: 0,
            standards: []
        }));

        // まずは、数量の多い規格をパレットに1つずつ配置する
        const seedCount = Math.min(sortedRecords.length, pallets.length);
        sortedRecords.slice(0, seedCount).forEach((record, index) => addRecord(pallets[index], record));

        sortedRecords.slice(seedCount).forEach((record) => {
            // C規格を考慮した数値に変換
            const weightedQuantity = getWeightedQuantity(record);
            // 最大容量144換算箱を超えないパレットを抽出する
            const availablePallets = pallets.filter((pallet) => pallet.totalQuantity + weightedQuantity <= 144);
            const candidates = availablePallets.length > 0 ? availablePallets : pallets;
            const selectedPallet = candidates.reduce((best, pallet) => {
                // TODO：現状は、B規格と○規格、C規格はが同じパレットに優先的に配置されないケースがあるため、対応する
                const currentScore = getPlacementScore(pallet, record, summary.averagePerPallet);
                const bestScore = getPlacementScore(best, record, summary.averagePerPallet);
                return currentScore < bestScore ? pallet : best;
            }, candidates[0]);
            addRecord(selectedPallet, record);
        });

        return pallets;
    }

    function getWeightedQuantity(record) {
        return record.category === 'C' ? record.quantity * 2 : record.quantity;
    }

    function addRecord(pallet, record) {
        pallet.totalQuantity += getWeightedQuantity(record);
        pallet.standards.push({ ...record, weightedQuantity: getWeightedQuantity(record) });
    }

    // パレットに配置するためのスコアを算出する関数
    // このスコアが低いほど、パレットに配置するのに適していると判断する
    function getPlacementScore(pallet, record, target) {
        // この標品を配置した場合のパレットの総量
        const nextTotal = pallet.totalQuantity + getWeightedQuantity(record);
        // B規格と○規格、C規格は、同じパレットに優先的に配分するためのスコア補正値
        const affinity = specialCategories.has(record.category)
            && pallet.standards.some((item) => specialCategories.has(item.category)) ? 30 : 0;
        // パレットに配置する平均値との差の絶対値をスコアとし、補正値を加味したスコアを返す
        return Math.abs(nextTotal - target) - affinity;
    }

    function renderSummary(summary) {
        const numberFormat = new Intl.NumberFormat('ja-JP');
        const cards = [
            ['B規格小計', summary.bSubtotal, '箱'],
            ['○規格小計', summary.oSubtotal, '箱'],
            ['全体合計', summary.total, '箱'],
            ['C規格換算後', summary.cAdjustedTotal, '換算箱'],
            ['1枚あたり平均', summary.averagePerPallet, '換算箱']
        ];
        document.getElementById('summaryCards').innerHTML = cards.map(([label, value, unit]) => `
            <div class="summary-card"><span>${label}</span><strong>${value === null ? '--' : numberFormat.format(value)}</strong><small>${value === null ? 'パレット枚数選択後' : unit}</small></div>
        `).join('');
    }

    function renderPlan(plan, summary) {
        const numberFormat = new Intl.NumberFormat('ja-JP');
        const hasOverCapacity = plan.some((pallet) => pallet.totalQuantity > 144);
        const planStatus = document.getElementById('planStatus');
        planStatus.textContent = hasOverCapacity ? '容量超過' : '配置済み';
        planStatus.className = `status-badge ${hasOverCapacity ? 'is-warning' : 'is-success'}`;
        document.getElementById('palletPlan').innerHTML = plan.map((pallet) => {
            const difference = pallet.totalQuantity - summary.averagePerPallet;
            const details = pallet.standards.map((item) => `${item.standard} ${numberFormat.format(item.quantity)}箱`).join(' / ');
            return `<article class="pallet-card">
                <div class="pallet-card-heading"><h4>パレット ${pallet.palletIndex}</h4><strong>${numberFormat.format(pallet.totalQuantity)}<small>換算箱</small></strong></div>
                <p>${details || '配置なし'}</p>
                <span class="difference ${difference > 0 ? 'over' : ''}">平均との差 ${difference >= 0 ? '+' : ''}${numberFormat.format(difference)}</span>
            </article>`;
        }).join('');
    }

    function renderBreakdown(records) {
        const numberFormat = new Intl.NumberFormat('ja-JP');
        document.getElementById('inputBreakdown').innerHTML = records.map((record) => `
            <div class="breakdown-row"><span><b>${record.standard}</b>${categoryLabels[record.category]}</span><strong>${numberFormat.format(record.quantity)}箱</strong></div>
        `).join('');
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        formMessage.textContent = '';
        const records = getRecords();

        if (!form.checkValidity()) {
            formMessage.textContent = '出荷日と品種名を入力してください。';
            form.reportValidity();
            return;
        }
        if (records.length === 0) {
            formMessage.textContent = '少なくとも1つの規格に数量を入力してください。';
            return;
        }
        if (records.some((record) => !Number.isInteger(record.quantity) || record.quantity < 0)) {
            formMessage.textContent = '数量は0以上の整数で入力してください。';
            return;
        }

        currentRecords = records;
        currentSummary = calculateSummary(records);
        document.getElementById('resultTitle').textContent = `${document.getElementById('varietyName').value} の出荷集計`;
        document.getElementById('resultDate').textContent = document.getElementById('shipmentDate').value;
        renderSummary(currentSummary);
        renderBreakdown(records);
        palletSettings.hidden = false;
        results.hidden = false;
        results.scrollIntoView({ block: 'start' });
    });

    calculatePlanButton.addEventListener('click', () => {
        palletMessage.textContent = '';
        const palletCount = Number(palletCountInput.value);
        if (!palletCount) {
            palletMessage.textContent = 'パレット枚数を1〜5枚から選択してください。';
            return;
        }

        currentSummary = calculateSummary(currentRecords, palletCount);
        const plan = buildPalletPlan(currentRecords, currentSummary);
        renderSummary(currentSummary);
        renderPlan(plan, currentSummary);
    });
});
