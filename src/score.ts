export class Score {
    points = 0;
    scoreElText: HTMLElement;
    scoreElContainer: HTMLElement;

    constructor() {
        this.createScoreEl();
    }

    addPoint(numOfPointsToAdd?: number) {
        if (numOfPointsToAdd !== undefined) {
            this.points += numOfPointsToAdd;
        }

        this.points++;
        this.updateScoreEl();
    }

    changeState() {
        if (this.points === 1) {
            this.scoreElContainer.id = 'score-10';
        }
    }

    updateScoreEl() {
        if (!this.scoreElText) {
            return;
        }

        this.scoreElText.textContent = this.points.toString();

        this.changeState();
        this.increaseFontSize();
    }

    increaseFontSize() {
        if (this.points > 10) {
            return;
        }
        this.scoreElContainer.style.fontSize = `${this.points * this.points}px`;
    }

    createScoreEl() {
        this.scoreElContainer = document.createElement('dir');
        this.scoreElContainer.classList.add('score-container');
        this.scoreElContainer.style.fontSize = `${this.points}px`;

        this.scoreElText = document.createElement('p');
        this.scoreElText.classList.add('score-text');

        this.updateScoreEl();

        this.scoreElContainer.appendChild(this.scoreElText);
        document.body.appendChild(this.scoreElContainer);
    }
}
