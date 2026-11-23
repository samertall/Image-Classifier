# Fieldwork — Image classifier

A standalone, responsive image-classification studio. Choose or drop an image to see the top ImageNet predictions from MobileNet v2.

## Run locally

The project has no build step or package dependencies. Serve this folder over HTTP (rather than opening `index.html` directly), for example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Model and privacy

TensorFlow.js and MobileNet are loaded from jsDelivr, and the pretrained model is fetched from TensorFlow's public model storage the first time an image is classified. Inference runs in the browser; selected images are not uploaded. An internet connection is required to load the libraries and model.

MobileNet is trained on ImageNet and recognizes 1,000 categories. Its predictions can be uncertain or miss context, so treat them as suggestions rather than facts.
