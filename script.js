/**
 * 2つの数値を足し算して表示するアプリ
 */
document.addEventListener('DOMContentLoaded', () => {
    const sumForm = document.getElementById('sumForm');
    const number1Input = document.getElementById('number1');
    const number2Input = document.getElementById('number2');
    const result = document.getElementById('result');

    function calculateSum() {
        const value1 = Number.parseFloat(number1Input.value);
        const value2 = Number.parseFloat(number2Input.value);

        if (number1Input.value === '' || number2Input.value === '') {
            result.textContent = '結果: 0';
            return;
        }

        if (Number.isNaN(value1) || Number.isNaN(value2)) {
            result.textContent = '結果: 数値を入力してください';
            return;
        }

        result.textContent = `結果: ${value1 + value2}`;
    }

    sumForm.addEventListener('submit', (event) => {
        event.preventDefault();
        calculateSum();
    });
});
