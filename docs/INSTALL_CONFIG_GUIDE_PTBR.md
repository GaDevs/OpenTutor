# Guia de Instalação e Configuração (PT-BR)

Este guia lista, com links oficiais, tudo que você precisa instalar e configurar para o OpenTutor funcionar com texto e voz no WhatsApp.

## Visão geral do que instalar

Obrigatório:

- Git (para clonar o repositório)
- Node.js 20+ (runtime do projeto)
- pnpm (gerenciador recomendado)
- Python 3.10+ (serviço STT)
- ffmpeg (STT + conversão de áudio para WhatsApp)
- Ollama (LLM local)
- Piper (TTS local)
- Modelo de voz Piper (`.onnx` + `.onnx.json`)

Opcional, mas recomendado:

- Colocar `ffmpeg` dentro de `./tools/ffmpeg/` (auto-detectado pelo projeto)

## 1. Git

Link oficial:

- https://git-scm.com/downloads

Instale o Git e confirme:

```bash
git --version
```

## 2. Node.js (20+)

Link oficial:

- https://nodejs.org/en/download/

Recomendação:

- Use uma versão LTS (`20+`)

Verifique:

```bash
node -v
npm -v
```

## 3. pnpm (recomendado)

Links oficiais:

- Instalação: https://pnpm.io/installation
- Documentação: https://pnpm.io/

Instalação (via npm, simples):

```bash
npm install -g pnpm
```

Verifique:

```bash
pnpm -v
```

## 4. Python 3.10+ (para STT)

Link oficial:

- https://www.python.org/downloads/

Verifique:

```bash
python --version
```

No Linux, também pode ser:

```bash
python3 --version
```

## 5. ffmpeg (obrigatório)

Link oficial:

- https://ffmpeg.org/download.html

O OpenTutor usa `ffmpeg` para:

- Decodificação de áudio no STT (via dependências do Whisper)
- Conversão de WAV para OGG/Opus (voice note do WhatsApp)

### Opção A (global): instalar no PATH

Depois de instalar, confirme:

```bash
ffmpeg -version
```

### Opção B (recomendada para onboarding): binário local no projeto

Crie/usar esta pasta (o setup já cria):

- `tools/ffmpeg/`

Coloque o binário com este nome:

- Windows: `tools/ffmpeg/ffmpeg.exe`
- Linux: `tools/ffmpeg/ffmpeg`

O OpenTutor detecta automaticamente esse caminho antes do `PATH`.

No Linux:

```bash
chmod +x ./tools/ffmpeg/ffmpeg
```

## 6. Ollama (LLM local)

Links oficiais:

- Site / download: https://ollama.com/
- Biblioteca de modelos: https://ollama.com/library

Instale o Ollama e confirme:

```bash
ollama --version
```

Baixe um modelo (exemplo):

```bash
ollama pull llama3.1
```

Outros exemplos compatíveis:

- `qwen2.5`
- `mistral`

Teste rápido:

```bash
ollama run llama3.1
```

## 7. Piper (TTS local)

Links oficiais / referência:

- Projeto Piper (GitHub): https://github.com/rhasspy/piper
- Voices (Hugging Face): https://huggingface.co/rhasspy/piper-voices

Instale o binário `piper` e confirme:

```bash
piper --help
```

Se não quiser colocar no `PATH`, você pode apontar `PIPER_BIN` no `.env`.

## 8. Baixar voz do Piper

O projeto já inclui scripts para baixar a voz padrão:

- Windows:

```powershell
.\scripts\download-piper-voice.ps1
```

- Linux:

```bash
./scripts/download-piper-voice.sh
```

Arquivos esperados (exemplo padrão):

- `services/tts/voices/en_US-lessac-medium.onnx`
- `services/tts/voices/en_US-lessac-medium.onnx.json`

## 9. Clonar o projeto e instalar dependências Node

```bash
git clone <URL_DO_REPO>
cd OpenTutor
pnpm install
```

Se `pnpm` não estiver disponível, o projeto também funciona com `npm`, mas o fluxo recomendado é `pnpm`.

## 10. Criar e ajustar `.env`

Crie a partir do exemplo:

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Campos principais para revisar:

- `MODEL` (ex.: `llama3.1`)
- `OLLAMA_BASE_URL` (padrão `http://127.0.0.1:11434`)
- `STT_BASE_URL` (padrão `http://127.0.0.1:8001`)
- `PIPER_BIN` (se `piper` não estiver no PATH)
- `PIPER_MODEL`
- `PIPER_CONFIG`
- `FFMPEG_BIN` (opcional se usar auto-detecção `tools/ffmpeg`)

Exemplo (Windows com ffmpeg local):

```env
MODEL=llama3.1
FFMPEG_BIN=./tools/ffmpeg/ffmpeg.exe
PIPER_MODEL=./services/tts/voices/en_US-lessac-medium.onnx
PIPER_CONFIG=./services/tts/voices/en_US-lessac-medium.onnx.json
```

## 11. Configurar o serviço STT (Python)

Entre na pasta e crie um ambiente virtual:

### Windows (PowerShell)

```powershell
cd services\stt
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\..
```

### Linux

```bash
cd services/stt
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

Opcional (ajuste de performance):

- `STT_MODEL_SIZE=small` (bom padrão CPU)
- `STT_DEVICE=cpu`
- `STT_COMPUTE_TYPE=int8`

## 12. Subir tudo e conectar WhatsApp

Execute:

```bash
pnpm dev
```

Isso inicia:

- Serviço STT (FastAPI)
- Bot WhatsApp (Node.js)

Primeira execução:

1. QR code aparece no terminal
2. Abra o WhatsApp no celular
3. `Aparelhos conectados` / `Linked Devices`
4. Escaneie o QR

## 13. Configurar o tutor (comandos iniciais)

Envie para o bot:

```text
/start
/language en
/mode lesson
/level A1
/corrections light
/voice on
```

## 14. Checklist de verificação (texto + voz)

Antes de testar, confirme:

- `ollama` está rodando
- modelo foi baixado (`ollama list`)
- `ffmpeg -version` funciona (ou binário local em `tools/ffmpeg`)
- `piper --help` funciona (ou `PIPER_BIN` configurado)
- voz do Piper existe em `services/tts/voices/`
- STT foi instalado no `.venv`

Teste:

1. Envie texto no WhatsApp
2. Envie áudio no WhatsApp
3. Verifique se o bot responde com texto e/ou voz

## 15. Se algo falhar

Consulte:

- `docs/TROUBLESHOOTING.md`
- `docs/QUICKSTART.md`

## Resumo rápido (ordem recomendada)

1. Instalar Git, Node.js, pnpm, Python
2. Instalar `ffmpeg`
3. Instalar Ollama + baixar modelo
4. Instalar Piper + baixar voz
5. `pnpm install`
6. Criar `.env`
7. Instalar `services/stt` (`pip install -r requirements.txt`)
8. `pnpm dev`
9. Escanear QR
