@REM Maven Wrapper script for Windows
@REM ----------------------------------------------------------------------------
@echo off
setlocal enabledelayedexpansion

set MAVEN_WRAPPER_PROPERTIES_PATH=.mvn\wrapper\maven-wrapper.properties

for /f "tokens=2 delims==" %%i in ('findstr /i "distributionUrl" "%MAVEN_WRAPPER_PROPERTIES_PATH%"') do set DISTRIBUTION_URL=%%i

set MAVEN_USER_HOME=%USERPROFILE%\.m2
set MAVEN_WRAPPER_DIR=%MAVEN_USER_HOME%\wrapper
for %%F in ("%DISTRIBUTION_URL%") do set DIST_FILENAME=%%~nxF
set DIST_DIR=%MAVEN_WRAPPER_DIR%\dists\%DIST_FILENAME:.zip=%

if not exist "%DIST_DIR%" (
    mkdir "%DIST_DIR%"
    echo Downloading Maven from %DISTRIBUTION_URL%
    powershell -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile '%DIST_DIR%\tmp.zip'"
    powershell -Command "Expand-Archive -Path '%DIST_DIR%\tmp.zip' -DestinationPath '%DIST_DIR%'"
    del "%DIST_DIR%\tmp.zip"
)

for /d %%D in ("%DIST_DIR%\*") do set MAVEN_HOME=%%D

"%MAVEN_HOME%\bin\mvn.cmd" %*
