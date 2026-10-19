# Contributing to Citizen Service Desk

Thank you for contributing! Please adhere to the following development standards:

1. **Environment Setup**:
   ```bash
   python -m venv .venv
   .venv/Scripts/activate  # on Windows
   pip install -r requirements-dev.txt
   ```

2. **Quality Gates**:
   - Keep test coverage at or above **90%**:
     ```bash
     pytest
     ```
   - Ensure clean code formatting and linting:
     ```bash
     ruff check .
     ruff format --check .
     ```

3. **Submitting Changes**:
   - Branch from `main`.
   - Add unit or integration tests for all new features and bug fixes.
   - Open a pull request with a descriptive summary of changes.

