"""Time series forecast for prediction PPO value."""


import pandas as pd
import numpy as np
from fbprophet import Prophet

df = pd.read_csv('./tmp/ppo.csv')

df['y'] = df['ppo']
df['ds'] = df['time']

m = Prophet()
m.fit(df)

future = m.make_future_dataframe(periods=1)

forecast = m.predict(future)

print(forecast.yhat[len(forecast) - 1])
