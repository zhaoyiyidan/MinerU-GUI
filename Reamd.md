mineru --help        
Options:
  -v, --version                   display the version and exit
  -p, --path PATH                 local filepath or directory. support pdf,
                                  png, jpg, jpeg files  [required]
  -o, --output PATH               output local directory  [required]
  -m, --method [auto|txt|ocr]     the method for parsing pdf: auto:
                                  Automatically determine the method based on
                                  the file type. txt: Use text extraction
                                  method. ocr: Use OCR method for image-based
                                  PDFs. Without method specified, 'auto' will
                                  be used by default. Adapted only for the
                                  case where the backend is set to "pipeline".
  -b, --backend [pipeline|vlm-transformers|vlm-sglang-engine|vlm-sglang-client]
                                  the backend for parsing pdf: pipeline: More
                                  general. vlm-transformers: More general.
                                  vlm-sglang-engine: Faster(engine). vlm-
                                  sglang-client: Faster(client). without
                                  method specified, pipeline will be used by
                                  default.
  -l, --lang [ch|ch_server|ch_lite|en|korean|japan|chinese_cht|ta|te|ka]
                                  Input the languages in the pdf (if known) to
                                  improve OCR accuracy.  Optional. Without
                                  languages specified, 'ch' will be used by
                                  default. Adapted only for the case where the
                                  backend is set to "pipeline".
  -u, --url TEXT                  When the backend is `sglang-client`, you
                                  need to specify the server_url, for
                                  example:`http://127.0.0.1:30000`
  -s, --start INTEGER             The starting page for PDF parsing, beginning
                                  from 0.
  -e, --end INTEGER               The ending page for PDF parsing, beginning
                                  from 0.
  -f, --formula BOOLEAN           Enable formula parsing. Default is True.
                                  Adapted only for the case where the backend
                                  is set to "pipeline".
  -t, --table BOOLEAN             Enable table parsing. Default is True.
                                  Adapted only for the case where the backend
                                  is set to "pipeline".
  -d, --device TEXT               Device mode for model inference, e.g.,
                                  "cpu", "cuda", "cuda:0", "npu", "npu:0",
                                  "mps". Adapted only for the case where the
                                  backend is set to "pipeline".
  --vram INTEGER                  Upper limit of GPU memory occupied by a
                                  single process. Adapted only for the case
                                  where the backend is set to "pipeline".
  --source [huggingface|modelscope|local]
                                  The source of the model repository. Default
                                  is 'huggingface'.
  --help                          Show this message and exit.