export class History<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  pushUndo(snapshot: T): void {
    this.undoStack.push(snapshot);
    this.redoStack = [];
  }

  undo(current: T): T | null {
    const prev = this.undoStack.pop();
    if (!prev) {
      return null;
    }
    this.redoStack.push(current);
    return prev;
  }

  redo(current: T): T | null {
    const next = this.redoStack.pop();
    if (!next) {
      return null;
    }
    this.undoStack.push(current);
    return next;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
