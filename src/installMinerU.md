# create conda environment and install mineru
1 conda create -n MinerU python=3.12 
# conda activate MinerU
1 conda activate MinerU
# install mineru
pip install --upgrade pip
pip install uv
uv pip install -U "mineru[core]"