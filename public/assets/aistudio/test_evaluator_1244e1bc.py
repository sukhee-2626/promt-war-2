
from evaluator import bkt_update

# P(L)=0.3, P(S)=0.1, P(G)=0.2, P(T)=0.15
p = 0.3
correct = True
new_p = bkt_update(p, correct, slip=0.1, guess=0.2, learn=0.15)
print(f"Old: {p}, New: {new_p}")
assert 0.4 < new_p < 0.5 # Basic check
