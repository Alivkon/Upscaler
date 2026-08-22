# Чинит кривой экспорт ONNX: у Real-ESRGAN и ClearRealityV1 с Hugging Face
# у ВЫХОДА объявлены те же символические размеры, что у входа ('width',
# 'height'), хотя выход вчетверо больше.
#
# На WASM это сходит с рук, а WebGPU верит объявлению, планирует переиспользовать
# буфер входа под выход и падает:
#   FAIL : Shape mismatch attempting to re-use buffer. {1,224,224,3} != {1,896,896,3}
#
# Лечится переименованием размеров у выхода. Полчаса ушло на то, чтобы понять,
# что дело не в onnxruntime и не в видеокарте, а в трёх строчках метаданных.
#
#   python3 fix-onnx-output-shape.py model.onnx model-fix.onnx
import sys
import onnx

src, dst = sys.argv[1], sys.argv[2]
m = onnx.load(src)
dim = m.graph.output[0].type.tensor_type.shape.dim
dim[2].dim_param, dim[3].dim_param = 'out_w', 'out_h'
while len(m.graph.value_info):        # выведенные формы от того же экспорта — выкинуть
    m.graph.value_info.pop()
onnx.save(m, dst)
print(dst, [d.dim_param or d.dim_value for d in dim])
