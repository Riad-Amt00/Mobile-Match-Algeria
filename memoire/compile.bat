@echo off
REM ─────────────────────────────────────────────────────────────────────────
REM compile.bat — Full LaTeX build sequence for the mémoire
REM Run from inside the memoire\ directory.
REM Engine: XeLaTeX + biber
REM ─────────────────────────────────────────────────────────────────────────

set MIKTEX=%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64

echo [1/4] First xelatex pass...
"%MIKTEX%\xelatex.exe" -interaction=nonstopmode main.tex
if errorlevel 1 goto error

echo [2/4] Running biber...
"%MIKTEX%\biber.exe" main
if errorlevel 1 goto error

echo [3/4] Second xelatex pass...
"%MIKTEX%\xelatex.exe" -interaction=nonstopmode main.tex
if errorlevel 1 goto error

echo [4/4] Third xelatex pass...
"%MIKTEX%\xelatex.exe" -interaction=nonstopmode main.tex
if errorlevel 1 goto error

echo.
echo BUILD SUCCESSFUL — main.pdf
goto end

:error
echo BUILD FAILED — check main.log
exit /b 1

:end
