self.importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.js');

// eslint-disable-next-line no-undef
const { pipeline, env } = transformers_2_6_0;
env.allowLocalModels = false;

class MyTranslationPipeline {
  static task = 'translation';
  static model = 'Xenova/nllb-200-distilled-600M';
  static instance = null;

  static async getInstance(progressCallback = null) {
    if (this.instance === null) {
      self.postMessage({ status: 'initiate', file: 'Model', progress: 0 });

      this.instance = await pipeline(this.task, this.model, {
        progress_callback: (data) => {
          self.postMessage({
            status: 'progress',
            file: data?.info || 'Model',
            progress: data?.progress || 0,
          });
          if (progressCallback) progressCallback(data);
        },
      });

      self.postMessage({ status: 'done', file: 'Model' });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { text, src_lang, tgt_lang } = event.data;

  try {
    const translator = await MyTranslationPipeline.getInstance();

    if (!self.readySent) {
      self.postMessage({ status: 'ready' });
      self.readySent = true;
    }

    const result = await translator(text, {
      src_lang,
      tgt_lang,
      callback_function: (update) => {
        const partialText = translator.tokenizer.decode(update[0].output_token_ids, {
          skip_special_tokens: true,
        });
        self.postMessage({ status: 'update', output: partialText });
      },
    });

    self.postMessage({
      status: 'complete',
      output: result[0].translation_text,
    });
  } catch (error) {
    self.postMessage({ status: 'error', error: error.message });
  }
});